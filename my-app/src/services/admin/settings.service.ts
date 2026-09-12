import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, ValidationError } from "@/src/lib/db/errors";
import type { SystemSettingType } from "@/src/lib/db/admin-enums";
import { hasPermission } from "@/src/lib/rbac/roles";
import {
  SETTING_DEFS,
  isSettingKey,
  validateSettingValue,
  type SettingCategory,
} from "@/src/lib/settings/catalog";
import {
  deleteSetting,
  getSetting,
  listSettings,
  upsertSetting,
} from "@/src/repositories/system-setting.repository";
import { listAuditEvents, recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * Typed system settings. Reads need settings.view (route gate); every
 * write re-checks the setting's own permission here, validates against
 * the closed registry, and audits before/after. No arbitrary keys.
 */

export interface SettingEntry {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  type: string;
  options?: readonly string[];
  value: string | number | boolean;
  source: "console" | "default";
  permission: string;
  updatedAt: string | null;
}

function storageType(key: string): SystemSettingType {
  const t = SETTING_DEFS[key].type;
  if (t === "boolean") return "boolean";
  if (t === "number") return "number";
  return "string";
}

export async function getSettings(): Promise<{ entries: SettingEntry[] }> {
  const rows = await listSettings();
  const byKey = new Map(rows.filter((r) => isSettingKey(r.key)).map((r) => [r.key, r]));
  const entries = Object.values(SETTING_DEFS).map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      category: def.category,
      type: def.type,
      options: def.options,
      value: (row?.value as string | number | boolean | undefined) ?? def.default,
      source: (row ? "console" : "default") as "console" | "default",
      permission: def.permission,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  });
  return { entries };
}

async function audit(
  staff: PlatformUser,
  action: string,
  key: string,
  metadata: Record<string, unknown> | undefined,
  ctx: RequestContext,
): Promise<void> {
  await recordAuditEvent({
    actorId: staff.user.id,
    actorRole: staff.role,
    action,
    resourceType: "setting",
    resourceId: key,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

/** Write one setting. Validated, permission-checked, audited. */
export async function setSetting(
  staff: PlatformUser,
  key: string,
  value: unknown,
  ctx: RequestContext,
): Promise<{ key: string }> {
  if (!isSettingKey(key)) {
    throw new ValidationError({ key: ["Unknown setting key."] });
  }
  const def = SETTING_DEFS[key];
  if (!hasPermission(staff.role, def.permission)) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  if (def.superadminOnly && staff.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Insufficient permissions.");
  }
  const { value: clean, errors } = validateSettingValue(key, value);
  if (errors || clean === undefined) {
    throw new ValidationError({ value: errors?.value ?? ["Invalid value."] });
  }
  const before = await getSetting(key);
  await upsertSetting({
    key,
    value: clean,
    type: storageType(key),
    category: def.category,
    description: def.description,
    isPublic: false,
    isEditable: true,
    updatedBy: staff.user.id,
  });
  await audit(
    staff,
    "SETTING_UPDATED",
    key,
    { before: (before?.value as unknown) ?? null, after: clean },
    ctx,
  );
  if (key.startsWith("maintenance.")) {
    const { invalidateMaintenanceCache } = await import("@/src/lib/settings/state");
    invalidateMaintenanceCache();
    const { notifyAdmin } = await import("@/src/services/admin-notifications.service");
    const enabling = key === "maintenance.enabled" && clean === true;
    void notifyAdmin({
      title: enabling ? "Maintenance mode enabled" : `Setting changed: ${key}`,
      body: `${staff.user.email} updated ${key}.`,
      severity: enabling ? "warning" : "info",
      priority: enabling ? "high" : "normal",
      source: "maintenance",
      linkHref: "/admin/settings",
      dedupeMin: 5,
    });
  }
  return { key };
}

/** Reset one setting (delete the override row). Audited. */
export async function resetSetting(
  staff: PlatformUser,
  key: string,
  ctx: RequestContext,
): Promise<{ key: string; reset: boolean }> {
  if (!isSettingKey(key)) {
    throw new ValidationError({ key: ["Unknown setting key."] });
  }
  const def = SETTING_DEFS[key];
  if (!hasPermission(staff.role, def.permission)) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  if (def.superadminOnly && staff.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Insufficient permissions.");
  }
  const before = await getSetting(key);
  const removed = await deleteSetting(key);
  if (removed) {
    await audit(staff, "SETTING_RESET", key, { before: (before?.value as unknown) ?? null }, ctx);
    if (key.startsWith("maintenance.")) {
      const { invalidateMaintenanceCache } = await import("@/src/lib/settings/state");
      invalidateMaintenanceCache();
      const { notifyAdmin } = await import("@/src/services/admin-notifications.service");
      void notifyAdmin({
        title: `Maintenance setting reset: ${key}`,
        body: `${staff.user.email} reset ${key} to its default.`,
        severity: "info",
        priority: "normal",
        source: "maintenance",
        linkHref: "/admin/settings",
        dedupeMin: 5,
      });
    }
  }
  return { key, reset: removed };
}

export interface HistoryEntry {
  id: string;
  key: string;
  action: string;
  actorId: string;
  actorRole?: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
}

/** Change history: settings audit trail, newest first. */
export async function getSettingsHistory(limit = 50): Promise<{ history: HistoryEntry[] }> {
  const events = await listAuditEvents({ resourceType: "setting", limit });
  return {
    history: events.map((e) => {
      const meta = (e.metadata ?? {}) as { before?: unknown; after?: unknown };
      return {
        id: e.id,
        key: e.resourceId ?? "",
        action: e.action,
        actorId: e.actorId,
        actorRole: e.actorRole,
        before: meta.before,
        after: meta.after,
        timestamp: e.timestamp.toISOString(),
      };
    }),
  };
}
