import Link from "next/link";
import { formatEnd, formatTime, type PlannedItemDTO } from "@/src/components/planner/types";

/** One scheduled task: time range, title, and the reason it landed here. */
export function PlanItem({ item }: { item: PlannedItemDTO }) {
  return (
    <li className="rounded-lg border border-zinc-200/80 bg-white p-2.5 transition-colors hover:border-zinc-300 hover:bg-zinc-50/60 focus-within:border-indigo-400 dark:border-zinc-800/80 dark:bg-transparent dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-md bg-zinc-900/[0.06] px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700 tabular-nums dark:bg-white/[0.08] dark:text-zinc-200">
          {formatTime(item.start)} – {formatEnd(item.start, item.durationMin)}
        </span>
        <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">{item.durationMin}m</span>
      </div>
      <Link
        href={`/tasks/${item.taskId}`}
        className="mt-1.5 block truncate text-sm font-medium text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-100"
      >
        {item.title}
      </Link>
      <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
        {item.reason}
      </span>
    </li>
  );
}
