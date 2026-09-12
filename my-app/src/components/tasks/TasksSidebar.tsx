import Link from "next/link";
import {
  CalendarClock,
  CheckCheck,
  ListTodo,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import type { TaskCountsDTO, TasksView } from "@/src/components/tasks/types";
import { cx } from "@/src/lib/utils/cx";

interface TasksSidebarProps {
  counts: TaskCountsDTO;
  active: string;
}

const links: Array<{
  href: string;
  view: TasksView;
  label: string;
  icon: LucideIcon;
  count: (c: TaskCountsDTO) => number;
  tone: (c: TaskCountsDTO) => BadgeTone;
}> = [
  { href: "/tasks", view: "all", label: "All tasks", icon: ListTodo, count: (c) => c.all, tone: () => "neutral" },
  { href: "/tasks/today", view: "today", label: "Today", icon: Sun, count: (c) => c.today, tone: (c) => (c.today > 0 ? "accent" : "neutral") },
  { href: "/tasks/upcoming", view: "upcoming", label: "Upcoming", icon: CalendarClock, count: (c) => c.upcoming, tone: () => "neutral" },
  { href: "/tasks/completed", view: "completed", label: "Completed", icon: CheckCheck, count: (c) => c.completed, tone: () => "success" },
  { href: "/tasks/overdue", view: "overdue", label: "Overdue", icon: TriangleAlert, count: (c) => c.overdue, tone: (c) => (c.overdue > 0 ? "danger" : "neutral") },
];

/** Server-rendered tasks nav with per-view counts. Zero client JS. */
export function TasksSidebar({ counts, active }: TasksSidebarProps) {
  return (
    <aside aria-label="Tasks navigation" className="w-60 shrink-0">
      <nav
        aria-label="Task views"
        className="sticky top-[4.5rem] rounded-xl border border-zinc-200/90 bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <ul className="space-y-0.5">
          {links.map((link) => {
            const isActive = active === link.href;
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
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
                  <Badge size="sm" tone={link.tone(counts)}>
                    {link.count(counts)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
