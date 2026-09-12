import {
  BarChart3,
  BellRing,
  CalendarClock,
  CalendarDays,
  Clock,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

/** Single icon map for sidebar, mobile nav, and command palette. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/planner": CalendarClock,
  "/notes": NotebookPen,
  "/tasks": ListChecks,
  "/calendar": CalendarDays,
  "/schedule": Clock,
  "/projects": FolderKanban,
  "/goals": Target,
  "/reminders": BellRing,
  "/templates": LayoutTemplate,
  "/search": Search,
  "/analytics": BarChart3,
  "/assistant": Sparkles,
  "/profile": User,
  "/admin": ShieldCheck,
};

export function navIcon(href: string): LucideIcon {
  return NAV_ICONS[href] ?? LayoutDashboard;
}
