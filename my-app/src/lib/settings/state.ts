import { SETTING_DEFS } from "@/src/lib/settings/catalog";

/**
 * Runtime setting reads for request paths. Typed getters with defaults;
 * unknown keys and invalid stored values fall back (never throw in the
 * request path). Maintenance state carries a short TTL cache so the API
 * gate doesn't add a query per call while still flipping within seconds.
 */

export async function getSettingValue<T extends string | number | boolean>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const def = SETTING_DEFS[key];
    if (!def) return fallback;
    const { getSetting } = await import("@/src/repositories/system-setting.repository");
    const row = await getSetting(key);
    if (!row) return fallback;
    const v = row.value as unknown;
    if (typeof fallback === "boolean") return (typeof v === "boolean" ? v : fallback) as T;
    if (typeof fallback === "number") return (typeof v === "number" ? v : fallback) as T;
    return (typeof v === "string" ? v : fallback) as T;
  } catch {
    return fallback;
  }
}

export interface MaintenanceState {
  enabled: boolean;
  message: string;
  /** ISO string or empty (unknown). */
  estimatedEndTime: string;
  allowAdminAccess: boolean;
  allowAuthentication: boolean;
}

let maintenanceCache: { at: number; state: MaintenanceState } | null = null;
const MAINTENANCE_TTL_MS = 5000;

/** Called after maintenance writes so flips apply on the next request. */
export function invalidateMaintenanceCache(): void {
  maintenanceCache = null;
}

export async function getMaintenanceState(): Promise<MaintenanceState> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.at < MAINTENANCE_TTL_MS) {
    return maintenanceCache.state;
  }
  const [enabled, message, estimatedEndTime, allowAdminAccess, allowAuthentication] =
    await Promise.all([
      getSettingValue("maintenance.enabled", false),
      getSettingValue(
        "maintenance.message",
        SETTING_DEFS["maintenance.message"].default as string,
      ),
      getSettingValue("maintenance.estimatedEndTime", ""),
      getSettingValue("maintenance.allowAdminAccess", true),
      getSettingValue("maintenance.allowAuthentication", true),
    ]);
  const state: MaintenanceState = {
    enabled,
    message,
    estimatedEndTime:
      typeof estimatedEndTime === "string" && estimatedEndTime && !Number.isNaN(Date.parse(estimatedEndTime))
        ? estimatedEndTime
        : "",
    allowAdminAccess,
    allowAuthentication,
  };
  maintenanceCache = { at: now, state };
  return state;
}

/**
 * Maintenance decision for an authenticated API caller. Staff continue
 * only when allowAdminAccess is on; /api/auth/* additionally requires
 * allowAuthentication. Pure function of state — trivially testable.
 */
export function isApiAllowedDuringMaintenance(
  state: MaintenanceState,
  pathname: string,
  isStaff: boolean,
): boolean {
  if (!state.enabled) return true;
  if (pathname.startsWith("/api/auth/")) return state.allowAuthentication;
  return isStaff && state.allowAdminAccess;
}
