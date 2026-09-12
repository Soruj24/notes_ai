import type { Permission } from "@/src/lib/rbac/permissions";

export interface NavItem {
  href: string;
  label: string;
  /** Active when pathname equals href or starts with href + "/". */
  matchPrefix?: boolean;
  /**
   * Platform permission required to see this item. Absent = visible to all
   * signed-in users. Evaluated centrally by `filterNavSections()` — never
   * check roles inline in components.
   */
  permission?: Permission;
  /**
   * Visible to any platform role (staff), without requiring one specific
   * permission — no single permission covers every staff role. Combine
   * with `permission` to require both.
   */
  staffOnly?: boolean;
  /**
   * Feature flag key hiding this item when off. Display-only: every flagged
   * surface re-checks server-side (services/routes evaluate per call).
   */
  flag?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Single source of truth for workspace navigation. Feature phases add items here. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/planner", label: "Planner" },
      { href: "/notes", label: "Notes", flag: "notes" },
      { href: "/tasks", label: "Tasks", flag: "tasks" },
      { href: "/calendar", label: "Calendar", flag: "calendar" },
      { href: "/schedule", label: "Schedule" },
      { href: "/projects", label: "Projects", flag: "projects" },
      { href: "/goals", label: "Goals", flag: "goals" },
      { href: "/reminders", label: "Reminders" },
      { href: "/templates", label: "Templates", flag: "templates" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/search", label: "Search" },
      { href: "/analytics", label: "Analytics", flag: "analytics" },
      { href: "/assistant", label: "Assistant", flag: "ai.assistant" },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/profile", label: "Profile" }],
  },
  {
    title: "Administration",
    items: [{ href: "/admin", label: "Admin Dashboard", staffOnly: true, matchPrefix: false }],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.matchPrefix !== false && pathname.startsWith(`${item.href}/`))
    return true;
  return false;
}
