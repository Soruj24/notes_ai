import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/src/lib/db/errors";
import { FEATURE_FLAG_ENVS, type FeatureFlagEnv } from "@/src/lib/db/admin-enums";
import { hasPermission } from "@/src/lib/rbac/roles";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";
import { FEATURE_CATALOG } from "@/src/lib/features/catalog";
import { ensureFeatureCatalog } from "@/src/lib/features/evaluation";
import { getFlag, listFlags, upsertFlag } from "@/src/repositories/feature-flag.repository";
import { findUserByEmail, findUsersByIds } from "@/src/repositories/user.repository";
import { recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * Feature flag administration. Only catalog keys are manageable (unknown
 * keys 404) — the console surface stays intentional. Every mutation
 * re-checks features.update here and audits before/after.
 */

export interface FeatureRow {
  key: string;
  name: string;
  description: string;
  group: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string[];
  targetUsers: Array<{ id: string; email: string }>;
  environment: FeatureFlagEnv;
  updatedAt: string;
}

export async function getFeatures(): Promise<{ features: FeatureRow[] }> {
  await ensureFeatureCatalog();
  const rows = await listFlags();
  const targetIds = [...new Set(rows.flatMap((r) => r.targetUsers))];
  const users = await findUsersByIds(targetIds);
  const emails = new Map(users.map((u) => [u.id, u.email]));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return {
    features: FEATURE_CATALOG.map((c) => {
      const row = byKey.get(c.key);
      return {
        key: c.key,
        name: row?.name ?? c.name,
        description: row?.description ?? c.description,
        group: c.group,
        enabled: row?.enabled ?? c.enabledByDefault,
        rolloutPercentage: row?.rolloutPercentage ?? 100,
        targetRoles: row?.targetRoles ?? [],
        targetUsers: (row?.targetUsers ?? []).map((id) => ({
          id,
          email: emails.get(id) ?? "(deleted user)",
        })),
        environment: row?.environment ?? "all",
        updatedAt: row ? row.updatedAt.toISOString() : new Date(0).toISOString(),
      };
    }),
  };
}

export interface FeatureUpdate {
  enabled?: boolean;
  rolloutPercentage?: number;
  environment?: FeatureFlagEnv;
  targetRoles?: string[];
  /** Target users by email (resolved to ids; unknown emails rejected). */
  targetUserEmails?: string[];
}

function validationError(field: string, msg: string): ValidationError {
  return new ValidationError({ [field]: [msg] });
}

export async function updateFeature(
  staff: PlatformUser,
  key: string,
  input: FeatureUpdate,
  ctx: RequestContext,
): Promise<FeatureRow> {
  if (!hasPermission(staff.role, "features.update")) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  const catalog = FEATURE_CATALOG.find((f) => f.key === key);
  if (!catalog) throw new NotFoundError("Unknown feature flag.");
  await ensureFeatureCatalog();
  const before = await getFlag(key);

  const patch: {
    enabled?: boolean;
    rolloutPercentage?: number;
    environment?: FeatureFlagEnv;
    targetRoles?: string[];
    targetUsers?: string[];
  } = {};
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== "boolean") throw validationError("enabled", "Must be a boolean.");
    patch.enabled = input.enabled;
  }
  if (input.rolloutPercentage !== undefined) {
    if (!Number.isInteger(input.rolloutPercentage) || input.rolloutPercentage < 0 || input.rolloutPercentage > 100) {
      throw validationError("rolloutPercentage", "Must be an integer between 0 and 100.");
    }
    patch.rolloutPercentage = input.rolloutPercentage;
  }
  if (input.environment !== undefined) {
    if (!(FEATURE_FLAG_ENVS as readonly string[]).includes(input.environment)) {
      throw validationError("environment", `Must be one of: ${FEATURE_FLAG_ENVS.join(", ")}.`);
    }
    patch.environment = input.environment;
  }
  if (input.targetRoles !== undefined) {
    if (!Array.isArray(input.targetRoles)) throw validationError("targetRoles", "Must be an array.");
    for (const r of input.targetRoles) {
      if (!(PLATFORM_ROLES as readonly string[]).includes(r)) {
        throw validationError("targetRoles", `Unknown platform role: ${r}.`);
      }
    }
    patch.targetRoles = [...new Set(input.targetRoles)];
  }
  if (input.targetUserEmails !== undefined) {
    if (!Array.isArray(input.targetUserEmails)) {
      throw validationError("targetUserEmails", "Must be an array of emails.");
    }
    const ids: string[] = [];
    for (const email of input.targetUserEmails) {
      if (typeof email !== "string" || !email.includes("@")) {
        throw validationError("targetUserEmails", `Invalid email: ${String(email)}.`);
      }
      const user = await findUserByEmail(email);
      if (!user) throw validationError("targetUserEmails", `Unknown user: ${email}.`);
      ids.push(user.id);
    }
    patch.targetUsers = [...new Set(ids)];
  }

  await upsertFlag({
    key,
    name: catalog.name,
    description: catalog.description,
    ...patch,
    updatedBy: staff.user.id,
  });
  const { notifyAdmin } = await import("@/src/services/admin-notifications.service");
  void notifyAdmin({
    title: `Feature ${patch.enabled === false ? "disabled" : "updated"}: ${catalog.name}`,
    body: `${staff.user.email} changed ${key}.`,
    severity: patch.enabled === false ? "warning" : "info",
    priority: patch.enabled === false ? "high" : "normal",
    source: "features",
    linkHref: "/admin/features",
    dedupeMin: 5,
  });
  await recordAuditEvent({
    actorId: staff.user.id,
    actorRole: staff.role,
    action:
      "enabled" in patch
        ? patch.enabled
          ? "FEATURE_ENABLED"
          : "FEATURE_DISABLED"
        : "FEATURE_UPDATED",
    resourceType: "feature",
    resourceId: key,
    metadata: {
      before: before
        ? {
            enabled: before.enabled,
            rolloutPercentage: before.rolloutPercentage,
            environment: before.environment,
            targetRoles: before.targetRoles,
            targetUsers: before.targetUsers,
          }
        : null,
      after: patch,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  const { features } = await getFeatures();
  const row = features.find((f) => f.key === key);
  if (!row) throw new NotFoundError("Unknown feature flag.");
  return row;
}
