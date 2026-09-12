"use client";

import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { formatDayHeading, formatHour, toDate, type ScheduleItemDTO } from "@/src/components/calendar/types";

interface AgendaSummaryProps {
  items: ScheduleItemDTO[];
  onSelect: (item: ScheduleItemDTO) => void;
}

/**
 * Schedule-only companion panel: up-next spotlight, range counts, and the
 * all-day queue. Mounted solely when CalendarPage receives showAgendaSummary
 * (the /schedule route) — /calendar/agenda never mounts it.
 */
export function AgendaSummary({ items, onSelect }: AgendaSummaryProps) {
  const now = new Date().getTime();
  const upcoming = items
    .filter((i) => !i.allDay && new Date(i.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const next = upcoming[0];
  const events = items.filter((i) => i.kind === "event").length;
  const tasks = items.filter((i) => i.kind === "task").length;
  const allDay = items.filter((i) => i.allDay).slice(0, 5);

  return (
    <aside
      aria-label="Schedule overview"
      className="order-1 grid min-w-0 gap-4 xl:order-2 xl:sticky xl:top-[4.5rem] xl:self-start"
    >
      <section
        aria-label="Up next"
        className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        {next ? (
          <button
            type="button"
            onClick={() => onSelect(next)}
            className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            <p className="text-[11px] font-semibold tracking-[0.06em] text-indigo-600 uppercase dark:text-indigo-300">
              Up next
            </p>
            <p className="mt-1 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
              {next.title}
            </p>
            <p className="mt-0.5 text-[13px] text-zinc-500 tabular-nums dark:text-zinc-400">
              {formatDayHeading(toDate(next.start))} · {formatHour(toDate(next.start))}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Open <ArrowRight size={12} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"
            >
              <CalendarCheck2 size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Nothing ahead</p>
              <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                No upcoming items in this range. Enjoy the open time.
              </p>
            </div>
          </div>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          {[
            { label: "Events", value: String(events) },
            { label: "Task deadlines", value: String(tasks) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-zinc-50 px-2.5 py-2 dark:bg-zinc-900/60">
              <dt className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {allDay.length > 0 ? (
        <section
          aria-label="All-day queue"
          className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
        >
          <h2 className="text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
            All-day ({allDay.length})
          </h2>
          <ul className="mt-2 grid gap-1">
            {allDay.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  title={item.title}
                  className="w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
