"use client";

import { useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useGetGoalsQuery } from "@/src/store/dashboardApi";

/** Active goals with progress bars and due-risk flags. */
export function GoalsProgress({ wid }: { wid: string }) {
  const { data, isLoading, isError, refetch } = useGetGoalsQuery({ wid });
  const [weekAhead] = useState(() => Date.now() + 7 * 86400000);
  const goals = (data?.goals ?? []).filter((g) => g.status === "active").slice(0, 4);

  return (
    <DashboardSection
      title="Goals"
      description="Active goals and momentum"
      icon={<Target size={16} aria-hidden="true" />}
      actionHref="/goals"
      actionLabel="All goals"
    >
      {isLoading ? (
        <div className="grid gap-4" aria-busy="true" aria-label="Loading goals">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">Could not load goals.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Retry
          </button>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No active goals</p>
          <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            Set one to track progress here.{" "}
            <Link href="/goals" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
              Create a goal
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {goals.map((goal) => {
            const atRisk =
              goal.targetDate && new Date(goal.targetDate).getTime() < weekAhead;
            const percent = goal.computedProgress?.percent ?? goal.progress;
            const clamped = Math.min(100, Math.max(0, percent));
            return (
              <li key={goal.id}>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/goals/${goal.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {goal.title}
                  </Link>
                  {atRisk ? (
                    <Badge size="sm" tone="warning">Due soon</Badge>
                  ) : null}
                  <span className="text-xs font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{clamped}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={clamped}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.title} progress`}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                >
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 dark:bg-zinc-100"
                    style={{ width: `${clamped}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
