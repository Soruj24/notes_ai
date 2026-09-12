import { USER_STATUSES, type UserStatus } from "@/src/lib/db/admin-enums";
import { PLATFORM_ROLES, type PlatformRole } from "@/src/lib/rbac/roles";
import type { SortDir, UserSortKey } from "@/src/repositories/user.repository";

export type FieldErrors = Record<string, string[]>;

export interface UserListQuery {
  search?: string;
  status?: UserStatus;
  /** Platform role name, "none" (no role), or undefined (all). */
  role?: string;
  sort: UserSortKey;
  dir: SortDir;
  limit: number;
  offset: number;
}

const SORT_KEYS: readonly string[] = ["createdAt", "lastActiveAt", "name", "email"];

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (USER_STATUSES as readonly string[]).includes(value);
}

/** Parse + clamp list query params. Unknown enums fall back to defaults. */
export function parseUserListQuery(params: URLSearchParams): UserListQuery {
  const rawSort = params.get("sort") ?? "createdAt";
  const rawDir = params.get("dir") ?? "desc";
  const rawStatus = params.get("status");
  const rawRole = params.get("role");
  return {
    search: params.get("q")?.trim() || undefined,
    status: rawStatus && isUserStatus(rawStatus) ? rawStatus : undefined,
    role:
      rawRole === "none" || (typeof rawRole === "string" && (PLATFORM_ROLES as readonly string[]).includes(rawRole))
        ? rawRole
        : undefined,
    sort: (SORT_KEYS.includes(rawSort) ? rawSort : "createdAt") as UserSortKey,
    dir: rawDir === "asc" ? "asc" : "desc",
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}

export function validateUserName(name: unknown): { name?: string; errors?: FieldErrors } {
  if (typeof name !== "string" || !name.trim()) {
    return { errors: { name: ["Name is required."] } };
  }
  const trimmed = name.trim();
  if (trimmed.length > 64) return { errors: { name: ["Name must be 64 characters or fewer."] } };
  return { name: trimmed };
}

export function validateUserStatus(
  status: unknown,
): { status?: UserStatus; errors?: FieldErrors } {
  if (!isUserStatus(status)) {
    return { errors: { status: [`Status must be one of: ${USER_STATUSES.join(", ")}.`] } };
  }
  return { status };
}

export function validateStatusReason(
  reason: unknown,
): { reason?: string; errors?: FieldErrors } {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return {};
  if (text.length > 500) return { errors: { reason: ["Reason must be 500 characters or fewer."] } };
  return { reason: text };
}

export function validatePlatformRole(
  role: unknown,
): { role?: PlatformRole | null; errors?: FieldErrors } {
  if (role === null || role === "none") return { role: null };
  if (typeof role === "string" && (PLATFORM_ROLES as readonly string[]).includes(role)) {
    return { role: role as PlatformRole };
  }
  return { errors: { role: ["Role must be a platform role or null."] } };
}
