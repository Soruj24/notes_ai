"use client";

import Link from "next/link";
import { CheckCircle2, ListChecks } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { TaskListItem } from "@/src/components/tasks/TaskListItem";
import { TaskSkeleton } from "@/src/components/tasks/TaskSkeleton";
import { useListTasksQuery } from "@/src/store/tasksApi";

/** Today's actionable tasks (includes overdue). Reuses the task row. */
export function TodayTasks({ wid }: { wid: string }) {
  const { data, isLoading, isError, refetch } = useListTasksQuery({ wid, view: "today" });

  return (
    <DashboardSection
      title="Today's focus"
      description={data && data.length > 0 ? `${Math.min(data.length, 5)} of ${data.length} due — most urgent first` : "What deserves your attention today"}
      icon={<ListChecks size={16} aria-hidden="true" />}
      actionHref="/tasks/today"
      actionLabel="All today"
    >
      {isLoading ? (
        <TaskSkeleton />
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">Could not load today&apos;s tasks.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Retry
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All clear for today</p>
            <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              No tasks due. Capture one above or{" "}
              <Link href="/tasks" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
                browse all tasks
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-2">
          {data.slice(0, 5).map((task) => (
            <TaskListItem key={task.id} wid={wid} task={task} />
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
