import Link from "next/link";
import { Archive, NotebookPen, Star, Trash, type LucideIcon } from "lucide-react";
import type { NoteCounts } from "@/src/repositories/note.repository";
import { Badge } from "@/src/components/ui/badge";
import type { TagDTO } from "@/src/components/notes/types";
import { cx } from "@/src/lib/utils/cx";

interface NotesSidebarProps {
  counts: NoteCounts;
  tags: TagDTO[];
  active: string;
  activeTag?: string;
}

const links: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  count: (c: NoteCounts) => number;
}> = [
  { href: "", label: "All notes", icon: NotebookPen, count: (c: NoteCounts) => c.all },
  { href: "/favorites", label: "Favorites", icon: Star, count: (c: NoteCounts) => c.favorites },
  { href: "/archived", label: "Archived", icon: Archive, count: (c: NoteCounts) => c.archived },
  { href: "/trash", label: "Trash", icon: Trash, count: (c: NoteCounts) => c.trash },
];

/** Server-rendered notes nav: views + tag filters. Zero client JS. */
export function NotesSidebar({ counts, tags, active, activeTag }: NotesSidebarProps) {
  return (
    <aside aria-label="Notes navigation" className="w-60 shrink-0">
      <nav
        aria-label="Notes sections"
        className="sticky top-[4.5rem] grid gap-5 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <ul className="space-y-0.5">
          {links.map((link) => {
            const href = `/notes${link.href}`;
            const isActive = active === href && !activeTag;
            const Icon = link.icon;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                    isActive
                      ? "bg-zinc-900/[0.06] font-semibold text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-50"
                      : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
                        : "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300",
                    )}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.25 : 2} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                  <Badge size="sm" tone={isActive ? "accent" : "neutral"}>
                    {link.count(counts)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
        {tags.length ? (
          <div>
            <p className="px-2 text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
              Tags
            </p>
            <ul className="mt-1.5 max-h-64 space-y-0.5 overflow-y-auto">
              {tags.map((tag) => {
                const href = `/notes?tag=${tag.id}`;
                const isActive = activeTag === tag.id;
                return (
                  <li key={tag.id}>
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                        isActive
                          ? "bg-zinc-900/[0.06] font-semibold text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-50"
                          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold text-zinc-400 dark:text-zinc-500"
                        style={tag.color ? { color: tag.color } : undefined}
                      >
                        #
                      </span>
                      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
