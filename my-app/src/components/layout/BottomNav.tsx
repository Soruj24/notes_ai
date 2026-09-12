"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ListChecks,
  House,
  Menu,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/src/lib/utils/cx";

interface BottomNavProps {
  onSearch: () => void;
  onMore: () => void;
}

const tabs: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

/**
 * Mobile bottom navigation (lg:hidden). Five thumb-reachable targets with
 * safe-area padding; content clearance comes from MainContent bottom padding.
 */
export function BottomNav({ onSearch, onMore }: BottomNavProps) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-zinc-800 dark:bg-zinc-950/90"
    >
      <ul className="grid grid-cols-5 px-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500",
                  active
                    ? "font-semibold text-zinc-900 dark:text-zinc-50"
                    : "font-medium text-zinc-500 dark:text-zinc-400",
                )}
              >
                {active && (
                  <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-zinc-900 dark:bg-zinc-50" />
                )}
                <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden="true" className="leading-none" />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search"
            className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-zinc-500 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400"
          >
            <Search size={20} aria-hidden="true" className="leading-none" />
            Search
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-label="More navigation"
            className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-zinc-500 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400"
          >
            <Menu size={20} aria-hidden="true" className="leading-none" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
