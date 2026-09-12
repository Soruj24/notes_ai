import { PERMISSIONS, type Permission } from "@/src/lib/rbac/permissions";

/**
 * Platform roles for the Admin Control Center. Orthogonal to workspace
 * roles (owner|admin|member|viewer in `src/lib/db/enums.ts`): a platform
 * role never grants workspace membership and vice versa.
 *
 * Least privilege: every grant below is the minimum for the job.
 * SUPER_ADMIN is the only wildcard ("*"); all other roles enumerate
 * explicit permissions so audits can diff them.
 */

export const PLATFORM_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MODERATOR",
  "SUPPORT",
  "ANALYST",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Hierarchy rank — higher outranks lower. Used for grant rules, never for grants. */
export const ROLE_RANK: Record<PlatformRole, number> = {
  SUPPORT: 1,
  ANALYST: 2,
  MODERATOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

const ADMIN_ALL: readonly Permission[] = [
  "users.view",
  "users.create",
  "users.update",
  "users.delete",
  "users.suspend",
  "notes.view",
  "notes.moderate",
  "notes.delete",
  "tasks.view",
  "tasks.moderate",
  "tasks.delete",
  "projects.view",
  "projects.moderate",
  "projects.delete",
  "ai.view",
  "ai.configure",
  "ai.manage",
  "ai.disable",
  "system.view",
  "system.configure",
  "features.view",
  "features.update",
  "analytics.view",
  "audit.view",
  "audit.export",
  "settings.view",
  "settings.update",
  "security.view",
  "security.configure",
  "workspaces.view",
  "workspaces.suspend",
  "calendar.view",
  "calendar.moderate",
  "calendar.delete",
  "goals.view",
  "goals.moderate",
  "goals.delete",
  "notifications.view",
];

/**
 * Explicit grants per role. SUPER_ADMIN's "*" covers the whole catalog,
 * including permissions added in the future.
 */
export const ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[] | readonly ["*"]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ADMIN_ALL,
  MODERATOR: [
    "users.view",
    "workspaces.view",
    "notes.view",
    "notes.moderate",
    "notes.delete",
    "tasks.view",
    "tasks.moderate",
    "tasks.delete",
    "projects.view",
    "projects.moderate",
    "projects.delete",
    "calendar.view",
    "calendar.moderate",
    "calendar.delete",
    "goals.view",
    "goals.moderate",
    "goals.delete",
    "notifications.view",
  ],
  SUPPORT: [
    "users.view",
    "workspaces.view",
    "notes.view",
    "tasks.view",
    "projects.view",
    "calendar.view",
    "goals.view",
    "notifications.view",
  ],
  ANALYST: ["analytics.view", "audit.view"],
};

/** Fail-closed normalization for role values read from the DB or network. */
export function normalizeRole(value: unknown): PlatformRole | null {
  return typeof value === "string" &&
    (PLATFORM_ROLES as readonly string[]).includes(value)
    ? (value as PlatformRole)
    : null;
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return normalizeRole(value) !== null;
}

/** Full permission set for a role. Absent/unknown role ⇒ no permissions. */
export function resolvePermissions(
  role: PlatformRole | null | undefined,
): readonly Permission[] {
  if (!role) return [];
  const grants = ROLE_PERMISSIONS[role];
  if ((grants as readonly string[]).includes("*")) return PERMISSIONS;
  return grants as readonly Permission[];
}

export function hasPermission(
  role: PlatformRole | null | undefined,
  permission: Permission,
): boolean {
  return resolvePermissions(role).includes(permission);
}

export function hasAllPermissions(
  role: PlatformRole | null | undefined,
  permissions: readonly Permission[],
): boolean {
  const granted = resolvePermissions(role);
  return permissions.every((p) => granted.includes(p));
}

export function hasAnyPermission(
  role: PlatformRole | null | undefined,
  permissions: readonly Permission[],
): boolean {
  const granted = resolvePermissions(role);
  return permissions.some((p) => granted.includes(p));
}

/** Rank comparison for administrative rules (grant/revoke/suspend targets). */
export function outranks(a: PlatformRole, b: PlatformRole): boolean {
  return ROLE_RANK[a] > ROLE_RANK[b];
}

/** Rank for target comparison. Regular users (null) rank 0. */
export function targetRank(role: PlatformRole | null | undefined): number {
  return role ? ROLE_RANK[role] : 0;
}

/**
 * May `actor` mutate `target`'s account (status/role)? Strictly higher rank
 * is required — peers never act on peers, so a compromised ADMIN cannot
 * suspend fellow ADMINs or SUPER_ADMINs (vertical privilege containment).
 * SUPER_ADMIN outranks everything by construction. Reads are unaffected:
 * staff may still inspect higher-ranked accounts.
 */
export function canActOnTarget(
  actor: PlatformRole | null | undefined,
  target: PlatformRole | null | undefined,
): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (!actor) return false;
  return ROLE_RANK[actor] > targetRank(target);
}

/**
 * May `actor` grant `target` to someone else? Only SUPER_ADMIN may grant
 * ADMIN or SUPER_ADMIN; ADMIN may grant strictly lower roles; nobody else
 * may grant anything. Prevents privilege escalation by construction.
 */
export function canGrantRole(
  actor: PlatformRole | null | undefined,
  target: PlatformRole,
): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "ADMIN") return ROLE_RANK[target] < ROLE_RANK.ADMIN;
  return false;
}

/**
 * Centralized nav filtering — the only place UI visibility is decided.
 * Items without `permission` are public to signed-in users; items with one
 * require it. Empty sections are dropped. Generic over the section type so
 * icon-carrying nav configs keep their shape.
 */
export function filterNavSections<
  TItem extends { permission?: Permission; staffOnly?: boolean },
  TSection extends { items: readonly TItem[] },
>(sections: readonly TSection[], role: PlatformRole | null | undefined): TSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          (!item.staffOnly || role != null) &&
          (!item.permission || hasPermission(role, item.permission)),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
