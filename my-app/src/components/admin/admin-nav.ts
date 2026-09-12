import {
  Activity,
  Bell,
  Briefcase,
  CalendarDays,
  ChartColumn,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  ToggleLeft,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/src/lib/rbac/permissions";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Absent = visible to every platform role. */
  permission?: Permission;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

/**
 * Single source of truth for console navigation. Visibility is decided
 * centrally by `filterNavSections()` — components never check roles inline.
 */
export const ADMIN_SECTIONS: AdminNavSection[] = [
  {
    title: "Manage",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users, permission: "users.view" },
      { href: "/admin/workspaces", label: "Workspaces", icon: Briefcase, permission: "workspaces.view" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/notes", label: "Notes", icon: NotebookPen, permission: "notes.view" },
      { href: "/admin/tasks", label: "Tasks", icon: ListTodo, permission: "tasks.view" },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, permission: "calendar.view" },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, permission: "projects.view" },
      { href: "/admin/goals", label: "Goals", icon: Target, permission: "goals.view" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/ai", label: "AI", icon: Sparkles, permission: "ai.view" },
      { href: "/admin/features", label: "Features", icon: ToggleLeft, permission: "features.view" },
      { href: "/admin/analytics", label: "Analytics", icon: ChartColumn, permission: "analytics.view" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, permission: "notifications.view" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "audit.view" },
      { href: "/admin/security", label: "Security", icon: ShieldCheck, permission: "security.view" },
      { href: "/admin/system", label: "System", icon: Activity, permission: "system.view" },
      { href: "/admin/system/maintenance", label: "Maintenance", icon: Wrench, permission: "settings.view" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

/** Flat command list for the admin command menu (role-filtered by callers). */
export function flattenAdminNav(
  sections: readonly AdminNavSection[],
): AdminNavItem[] {
  return sections.flatMap((s) => s.items);
}

export function isAdminActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface AdminCrumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail for an /admin/* pathname. Id segments render as Detail. */
export function adminCrumbs(pathname: string): AdminCrumb[] {
  const flat = flattenAdminNav(ADMIN_SECTIONS);
  const byHref = new Map(flat.map((item) => [item.href, item.label]));
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  const crumbs: AdminCrumb[] = [{ label: "Overview", href: "/admin" }];
  let acc = "/admin";
  for (const segment of segments) {
    acc += `/${segment}`;
    const exact = byHref.get(acc);
    if (exact) {
      crumbs.push({ label: exact, href: acc });
    } else if (/^[0-9a-f]{24}$/i.test(segment)) {
      crumbs.push({ label: "Detail" });
    } else {
      crumbs.push({
        label: segment
          .split("-")
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
          .join(" "),
      });
    }
  }
  return crumbs;
}
