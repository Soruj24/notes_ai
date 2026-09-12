import Link from "next/link";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { ProgressBar, ProgressText } from "@/src/components/ui/progress";
import type { GoalDTO } from "@/src/components/projects/types";
import { cx } from "@/src/lib/utils/cx";

const frequencyLabel: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const statusTone: Record<string, BadgeTone> = {
  active: "accent",
  achieved: "success",
  abandoned: "neutral",
};

/** Goal summary card with computed progress + source hint. */
export function GoalCard({ goal }: { goal: GoalDTO }) {
  const computed = goal.computedProgress;
  const [now] = useState(() => Date.now());
  const target = goal.targetDate ? new Date(goal.targetDate).getTime() : null;
  const overdue = goal.status === "active" && target !== null && target < now;
  const dueSoon =
    !overdue && goal.status === "active" && target !== null && target - now < 7 * 86400000;
  const dimmed = goal.status !== "active";
  return (
    <Link
      href={`/goals/${goal.id}`}
      className={cx(
        "group block rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgb(0_0_0/0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-950 dark:shadow-none dark:hover:shadow-none",
        overdue
          ? "border-red-300 hover:border-red-400 dark:border-red-900/70 dark:hover:border-red-800"
          : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
        dimmed && "opacity-80",
      )}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 group-hover:underline group-hover:decoration-zinc-300 group-hover:underline-offset-4 dark:text-zinc-50">
          {goal.title}
        </p>
        {overdue ? (
          <Badge size="sm" tone="danger">Overdue</Badge>
        ) : dueSoon ? (
          <Badge size="sm" tone="warning">Due soon</Badge>
        ) : goal.status !== "active" ? (
          <Badge size="sm" tone={statusTone[goal.status] ?? "neutral"}>
            {goal.status}
          </Badge>
        ) : null}
        <Badge size="sm" tone="neutral">{frequencyLabel[goal.frequency] ?? goal.frequency}</Badge>
      </div>
      {goal.description ? (
        <p className="mt-1.5 line-clamp-2 min-h-10 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          {goal.description}
        </p>
      ) : null}
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <ProgressBar value={computed.percent} label={`${goal.title} progress`} />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <ProgressText done={computed.done} total={computed.total} />
          <span className="inline-flex shrink-0 items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {goal.targetDate ? (
              <span
                className={cx(
                  "inline-flex items-center gap-1 tabular-nums",
                  (overdue || dueSoon) && "font-semibold",
                  overdue
                    ? "text-red-600 dark:text-red-400"
                    : dueSoon
                      ? "text-amber-700 dark:text-amber-300"
                      : undefined,
                )}
              >
                <CalendarDays size={11} aria-hidden="true" />
                {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            ) : null}
            <span>
              {computed.source === "tasks"
                ? "from tasks"
                : computed.source === "milestones"
                  ? "from milestones"
                  : "manual"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
