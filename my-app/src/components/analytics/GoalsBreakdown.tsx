import Link from "next/link";
import { Target } from "lucide-react";
import { ProgressBar } from "@/src/components/ui/progress";
import type { AnalyticsData } from "@/src/store/analyticsApi";

const sourceLabel: Record<string, string> = {
  tasks: "from tasks",
  milestones: "from milestones",
  manual: "manual",
};

/** Goal progress rows with computed-source hints. */
export function GoalsBreakdown({ data }: { data: AnalyticsData }) {
  return (
    <section
      aria-label="Goal progress"
      className="min-w-0 rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
        >
          <Target size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Goal progress
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Active goals in this workspace</p>
        </div>
        <Link
          href="/goals"
          className="ml-auto shrink-0 rounded-md px-1.5 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
        >
          All goals →
        </Link>
      </div>
      {data.goals.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          No active goals in this workspace.{" "}
          <Link href="/goals" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
            Set one
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.goals.map((goal) => (
            <li key={goal.id}>
              <div className="flex items-baseline gap-2 text-sm">
                <Link
                  href={`/goals/${goal.id}`}
                  className="min-w-0 flex-1 truncate font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                >
                  {goal.title}
                </Link>
                <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {goal.percent}% · {sourceLabel[goal.source] ?? goal.source}
                </span>
              </div>
              <ProgressBar value={goal.percent} label={`${goal.title} progress`} className="mt-1.5" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
