"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, isNavActive } from "@/src/components/layout/nav";
import { navIcon } from "@/src/components/layout/nav-icons";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";
import { useFeatures } from "@/src/lib/features/client";
import { cx } from "@/src/lib/utils/cx";

interface SidebarProps {
  collapsed: boolean;
  role: PlatformRole | null;
  siteName: string;
}

/**
 * Desktop sidebar. Fixed width in both states (w-64 / w-[76px]) so toggling
 * never reflows the page. Rendered once by AppShell; only the active link
 * updates on navigation.
 */
export function Sidebar({ collapsed, role, siteName }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const { enabled, loaded } = useFeatures();
  // Centralized visibility: roles via filterNavSections, feature flags via
  // the shared feature service (fail-open while loading — backend enforces).
  const sections = filterNavSections(NAV_SECTIONS, role)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.flag || !loaded || enabled(item.flag)),
    }))
    .filter((section) => section.items.length > 0);
  return (
    <aside
      aria-label="Workspace navigation"
      className={cx(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-zinc-200/80 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-zinc-900">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-zinc-900 text-[15px] font-bold text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
        >
          {siteName.charAt(0).toUpperCase() || "N"}
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">{siteName}</span>
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Workspace</span>
          </span>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mt-5 first:mt-1">
            {!collapsed && (
              <p className="px-2 text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
                {section.title}
              </p>
            )}
            {collapsed && <div aria-hidden="true" className="mx-3 border-t border-zinc-100 first:hidden dark:border-zinc-900" />}
            <ul className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = navIcon(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cx(
                        "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                        active
                          ? "bg-zinc-900/[0.06] font-semibold text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-50"
                          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
                            : "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300",
                        )}
                      >
                        <Icon size={15} strokeWidth={active ? 2.25 : 2} />
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && active && (
                        <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="shrink-0 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <p className="text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-900">⌘K</kbd>{" "}
            search · <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-900">?</kbd> shortcuts
          </p>
        </div>
      )}
    </aside>
  );
}
