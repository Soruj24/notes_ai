"use client";

import Link from "next/link";
import { CalendarClock, CalendarX2 } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { useGetScheduleQuery } from "@/src/store/scheduleApi";
import { cx } from "@/src/lib/utils/cx";

/** Today's chronological timeline (events + task deadlines). */
export function TodayTimeline({ wid }: { wid: string }) {
  const { data, isLoading, isError, refetch } = useGetScheduleQuery({
    wid,
    view: "day",
    date: new Date().toISOString(),
  });

  return (
    <DashboardSection
      title="Today's timeline"
      description="Schedule and deadlines in chronological order"
      icon={<CalendarClock size={16} aria-hidden="true" />}
      actionHref="/schedule"
      actionLabel="Schedule"
    >
      {isLoading ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading timeline">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">Could not load the timeline.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Retry
          </button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300">
            <CalendarX2 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Nothing scheduled today</p>
            <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              Open{" "}
              <Link href="/planner" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
                Planner
              </Link>{" "}
              to design a focused day.
            </p>
          </div>
        </div>
      ) : (
        <ol className="relative grid gap-1">
          {data.items.slice(0, 6).map((item, i, arr) => {
            const start = new Date(item.start);
            const time = item.allDay
              ? "All day"
              : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
            const href = item.kind === "task" ? `/tasks/${item.sourceId}` : "/calendar";
            const isLast = i === arr.length - 1;
            return (
              <li key={item.key} className="relative flex gap-3">
                <div aria-hidden="true" className="flex w-16 shrink-0 flex-col items-end pt-2">
                  <span className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">{time}</span>
                </div>
                <div aria-hidden="true" className="relative flex w-4 shrink-0 justify-center">
                  {!isLast && <span className="absolute top-7 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />}
                  <span
                    className={cx(
                      "mt-2.5 h-2 w-2 rounded-full ring-4",
                      item.kind === "task"
                        ? "bg-amber-500 ring-amber-500/15"
                        : "bg-indigo-500 ring-indigo-500/15",
                    )}
                  />
                </div>
                <Link
                  href={href}
                  className="mb-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-zinc-200 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </span>
                  <Badge size="sm" tone={item.kind === "task" ? "warning" : "accent"}>
                    {item.kind === "task" ? "Task" : "Event"}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </DashboardSection>
  );
}
