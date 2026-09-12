import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  FolderKanban,
  Pencil,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { ActionCardData } from "@/src/components/assistant/types";

const icons: Record<string, LucideIcon> = {
  task: Circle,
  note: Pencil,
  event: CalendarDays,
  project: FolderKanban,
  content: Search,
};

/** Result card for a validated tool mutation. Links to the live entity. */
export function AIActionCard({ action }: { action: ActionCardData }) {
  const Icon = icons[action.type] ?? Check;
  const body = (
    <>
      <Icon size={14} aria-hidden="true" className="shrink-0 text-zinc-400" />
      <span className="min-w-0 flex-1 truncate text-sm">{action.label}</span>
      {action.href ? (
        <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-zinc-400" />
      ) : null}
    </>
  );
  const classes =
    "flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-transparent dark:hover:border-zinc-700 dark:hover:bg-zinc-900";
  if (action.href) {
    return (
      <Link href={action.href} className={classes}>
        {body}
      </Link>
    );
  }
  return <span className={classes}>{body}</span>;
}
