"use client";

import Link from "next/link";
import { CalendarDays, Repeat } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Skeleton } from "@/src/components/ui/skeleton";
import { formatDayHeading, toDate } from "@/src/components/calendar/types";
import { useGetScheduleQuery } from "@/src/store/scheduleApi";

/** Next event occurrences (recurrence-expanded by the schedule API). */
export function UpcomingEvents({ wid }: { wid: string }) {
  const { data, isLoading } = useGetScheduleQuery({
    wid,
    view: "agenda",
    date: new Date().toISOString(),
  });
  const events = (data?.items ?? []).filter((i) => i.kind === "event").slice(0, 5);

  return (
    <DashboardSection
      title="Next up"
      description="Events in the next two weeks"
      icon={<CalendarDays size={16} aria-hidden="true" />}
      actionHref="/calendar"
      actionLabel="Calendar"
    >
      {isLoading || !data ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading upcoming events">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Nothing coming up</p>
          <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            No events in the next two weeks.{" "}
            <Link href="/calendar" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
              Open calendar
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid gap-1">
          {events.map((item) => {
            const start = toDate(item.start);
            return (
              <li key={item.key}>
                <Link
                  href="/calendar"
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-900"
                >
                  <span className="w-[92px] shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDayHeading(start)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</span>
                  {item.isRecurringInstance ? (
                    <span className="flex shrink-0 items-center text-zinc-400" title="Recurring">
                      <Repeat size={13} aria-hidden="true" />
                      <span className="sr-only">Recurring</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
