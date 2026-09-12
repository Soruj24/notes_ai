import { ForbiddenError } from "@/src/lib/db/errors";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { FEATURE_CATALOG } from "@/src/lib/features/catalog";
import { getFlag } from "@/src/repositories/feature-flag.repository";
import { FeatureFlag } from "@/src/models/feature-flag.model";
import { db } from "@/src/repositories/base";

/**
 * Central feature evaluation. Precedence (matches the model docs):
 * environment mismatch ⇒ off; enabled false ⇒ off; empty targeting ⇒
 * on for everyone; otherwise on only when the user, role, or deterministic
 * rollout hash matches.
 *
 * Audience semantics: explicit user/role targets are RESTRICTIONS — when
 * any are set, only listed audiences pass and rolloutPercentage is
 * ignored. Rollout applies solely to untargeted flags (gradual release).
 * Failure policy is fail-OPEN (unknown keys, missing rows, infra errors):
 * flags are rollout controls, not security boundaries — RBAC stays the
 * enforcement for authorization. The admin console shows effective state
 * so operators can see exactly what evaluates.
 */

const ensured = new Set<string>();

/** Seed-if-missing: defaults apply once, operator state is never overwritten. */
export async function ensureFeatureCatalog(): Promise<void> {
  await db();
  const missing = FEATURE_CATALOG.filter((f) => !ensured.has(f.key));
  if (!missing.length) return;
  await Promise.all(
    missing.map((f) =>
      FeatureFlag.updateOne(
        { key: f.key },
        {
          $setOnInsert: {
            key: f.key,
            enabled: f.enabledByDefault,
            rolloutPercentage: 100,
            targetRoles: [],
            targetUsers: [],
            environment: "all",
          },
          $set: { name: f.name, description: f.description },
        },
        { upsert: true },
      ).then(() => {
        ensured.add(f.key);
      }),
    ),
  );
}

/** Deterministic per-user bucket (no sticky store): djb2 hex digest. */
export function rolloutBucket(key: string, userId: string): number {
  let hash = 5381;
  const input = `${key}:${userId}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export interface EvaluationContext {
  userId?: string;
  role?: PlatformRole | null;
}

export function currentEnvironment(): string {
  return process.env.APP_ENV || process.env.NODE_ENV || "development";
}

export async function isFeatureEnabled(key: string, ctx: EvaluationContext = {}): Promise<boolean> {
  try {
    await ensureFeatureCatalog();
    const flag = await getFlag(key);
    if (!flag) return true;
    if (!flag.enabled) return false;
    if (flag.environment !== "all" && flag.environment !== currentEnvironment()) return false;

    const hasAudienceTargets = flag.targetUsers.length > 0 || flag.targetRoles.length > 0;
    const hasTargets = hasAudienceTargets || flag.rolloutPercentage < 100;
    if (!hasTargets) return true;

    let userId = ctx.userId;
    let role = ctx.role;
    if ((!userId || !role) && ctx.userId) {
      const { findUserById } = await import("@/src/repositories/user.repository");
      const user = await findUserById(ctx.userId).catch(() => null);
      if (user) {
        userId = user.id;
        role = user.role;
      }
    }
    if (userId && flag.targetUsers.includes(userId)) return true;
    if (role && (flag.targetRoles as string[]).includes(role)) return true;
    if (
      !hasAudienceTargets &&
      userId &&
      flag.rolloutPercentage > 0 &&
      rolloutBucket(key, userId) < flag.rolloutPercentage
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Service/route gate: throws 403 when the feature is off for this user. */
export async function requireFlag(key: string, userId: string, label = key): Promise<void> {
  const ok = await isFeatureEnabled(key, { userId });
  if (!ok) throw new ForbiddenError(`${label} is currently disabled.`);
}
