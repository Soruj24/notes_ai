"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/src/lib/utils/cx";

const tabs = [
  { href: "/notes", label: "All" },
  { href: "/notes/favorites", label: "Favorites" },
  { href: "/notes/archived", label: "Archived" },
  { href: "/notes/trash", label: "Trash" },
];

/** Horizontal view switcher for phones (sidebar is desktop-only). */
export function NotesViewTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Notes views" className="md:hidden">
      <ul
        className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        role="tablist"
        aria-label="Notes views"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "block truncate rounded-lg px-2 py-2 text-center text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
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
