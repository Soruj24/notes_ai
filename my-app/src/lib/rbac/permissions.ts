/**
 * Platform permission catalog. Single source of truth for every
 * privileged capability in the Admin Control Center.
 *
 * `<domain>.<action>` strings are stable API — never rename a granted
 * permission; add new ones instead. Both server enforcement
 * (`src/lib/api/admin.ts`) and client gating (`Can`) resolve against
 * this catalog, so frontend and backend can never drift apart.
 */

export const PERMISSIONS = [
  // Users
  "users.view",
  "users.create",
  "users.update",
  "users.delete",
  "users.suspend",
  "users.impersonate",
  // Notes
  "notes.view",
  "notes.moderate",
  "notes.delete",
  // Tasks
  "tasks.view",
  "tasks.moderate",
  "tasks.delete",
  // Projects
  "projects.view",
  "projects.moderate",
  "projects.delete",
  // AI
  "ai.view",
  "ai.configure",
  "ai.manage",
  "ai.disable",
  // System
  "system.view",
  "system.configure",
  // Features
  "features.view",
  "features.update",
  // Analytics
  "analytics.view",
  // Audit
  "audit.view",
  "audit.export",
  // Settings
  "settings.view",
  "settings.update",
  // Security
  "security.view",
  "security.configure",
  // Workspaces
  "workspaces.view",
  "workspaces.suspend",
  "workspaces.delete",
  // Calendar
  "calendar.view",
  "calendar.moderate",
  "calendar.delete",
  // Goals
  "goals.view",
  "goals.moderate",
  "goals.delete",
  // Notifications
  "notifications.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Grouped view for admin UIs (flag editors, role detail screens). */
export const PERMISSION_GROUPS: Array<{
  domain: string;
  permissions: Permission[];
}> = [
  { domain: "Users", permissions: ["users.view", "users.create", "users.update", "users.delete", "users.suspend", "users.impersonate"] },
  { domain: "Notes", permissions: ["notes.view", "notes.moderate", "notes.delete"] },
  { domain: "Tasks", permissions: ["tasks.view", "tasks.moderate", "tasks.delete"] },
  { domain: "Projects", permissions: ["projects.view", "projects.moderate", "projects.delete"] },
  { domain: "AI", permissions: ["ai.view", "ai.configure", "ai.manage", "ai.disable"] },
  { domain: "System", permissions: ["system.view", "system.configure"] },
  { domain: "Features", permissions: ["features.view", "features.update"] },
  { domain: "Analytics", permissions: ["analytics.view"] },
  { domain: "Audit", permissions: ["audit.view", "audit.export"] },
  { domain: "Settings", permissions: ["settings.view", "settings.update"] },
  { domain: "Security", permissions: ["security.view", "security.configure"] },
  { domain: "Workspaces", permissions: ["workspaces.view", "workspaces.suspend", "workspaces.delete"] },
  { domain: "Calendar", permissions: ["calendar.view", "calendar.moderate", "calendar.delete"] },
  { domain: "Goals", permissions: ["goals.view", "goals.moderate", "goals.delete"] },
  { domain: "Notifications", permissions: ["notifications.view"] },
];

/** Runtime guard for values arriving as `unknown` (query params, JWTs, etc.). */
export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === "string" &&
    (PERMISSIONS as readonly string[]).includes(value)
  );
}
