"use client";

import { useState } from "react";
import { CalendarX2, Flag, FolderKanban } from "lucide-react";
import { Breakdown } from "@/src/components/analytics/Breakdown";
import { DailyChart } from "@/src/components/analytics/DailyChart";
import { GoalsBreakdown } from "@/src/components/analytics/GoalsBreakdown";
import { HighlightsCard } from "@/src/components/analytics/HighlightsCard";
import { StatCards } from "@/src/components/analytics/StatCards";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cx } from "@/src/lib/utils/cx";
import { useGetAnalyticsQuery, type AnalyticsRange } from "@/src/store/analyticsApi";

const ranges: AnalyticsRange[] = ["today", "week", "month"];

/** Analytics overview. Every figure comes from the analytics API. */
export function AnalyticsPage({ wid }: { wid: string }) {
  const [range, setRange] = useState<AnalyticsRange>("week");
  const { data, isLoading, isError, refetch } = useGetAnalyticsQuery({ wid, range });

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Analytics
          </h1>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            How your work is moving — completions, focus, and momentum.
          </p>
        </div>
        <span
          className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 max-sm:w-full sm:ml-auto sm:w-auto dark:bg-zinc-900"
          role="tablist"
          aria-label="Analytics range"
        >
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={cx(
                "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                range === r
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              {r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
            </button>
          ))}
        </span>
      </div>

      {isError ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <CalendarX2 size={22} />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Could not load analytics
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Check your connection and try again — your data is safe.
          </p>
          <Button size="sm" onClick={() => refetch()} className="mt-5">
            Retry
          </Button>
        </div>
      ) : isLoading || !data ? (
        <div className="grid gap-3 sm:gap-4" aria-busy="true" aria-label="Loading analytics">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px] w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <StatCards data={data} />
          <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
            <DailyChart data={data} />
            <HighlightsCard data={data} />
          </div>
          <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
            <Breakdown
              title="Tasks by priority"
              description="Where your effort concentrates"
              icon={<Flag size={15} aria-hidden="true" />}
              rows={data.byPriority.map((p) => ({
                id: p.priority,
                label: p.priority,
                done: p.done,
                total: p.total,
              }))}
              emptyText="No tasks in this range yet."
            />
            <Breakdown
              title="Tasks by project"
              description="Progress across active work"
              icon={<FolderKanban size={15} aria-hidden="true" />}
              rows={data.byProject.map((p) => ({
                id: p.projectId,
                label: p.name,
                done: p.done,
                total: p.total,
              }))}
              emptyText="No projects with tasks in this range yet."
            />
          </div>
          <GoalsBreakdown data={data} />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            * Focus time is estimated from completed task durations (30 min default each).
          </p>
        </>
      )}
    </div>
  );
}
