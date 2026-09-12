"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/src/lib/utils/cx";

const tabs = [
  { href: "/tasks", label: "All" },
  { href: "/tasks/today", label: "Today" },
  { href: "/tasks/upcoming", label: "Upcoming" },
  { href: "/tasks/completed", label: "Done" },
  { href: "/tasks/overdue", label: "Overdue" },
];

/** Horizontal view switcher for phones (sidebar is desktop-only). */
export function TasksViewTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Task views" className="md:hidden">
      <ul
        role="tablist"
        aria-label="Task views"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-900 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0 flex-1">
              <Link
                href={tab.href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "block rounded-lg px-3.5 py-2 text-center text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  active
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
