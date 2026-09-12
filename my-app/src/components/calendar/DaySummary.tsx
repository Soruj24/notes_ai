"use client";

import { CalendarCheck2, Sun } from "lucide-react";
import { formatHour, type ScheduleItemDTO } from "@/src/components/calendar/types";
import { cx } from "@/src/lib/utils/cx";

interface DaySummaryProps {
  items: ScheduleItemDTO[];
  onSelect: (item: ScheduleItemDTO) => void;
}

/**
 * Day-view-only companion panel: counts, planned time, busy span, and
 * all-day items. Rendered solely for view === "day" — week, month, and
 * agenda never mount it. All values derive from the loaded schedule items.
 */
export function DaySummary({ items, onSelect }: DaySummaryProps) {
  const events = items.filter((i) => i.kind === "event");
  const tasks = items.filter((i) => i.kind === "task");
  const allDay = items.filter((i) => i.allDay);
  const timed = items.filter((i) => !i.allDay);

  const plannedMin = timed.reduce((n, i) => {
    const ms = new Date(i.end).getTime() - new Date(i.start).getTime();
    return n + Math.max(0, Math.round(ms / 60000));
  }, 0);
  const hours = Math.floor(plannedMin / 60);
  const mins = plannedMin % 60;

  const starts = timed.map((i) => new Date(i.start).getTime());
  const ends = timed.map((i) => new Date(i.end).getTime());
  const span =
    starts.length > 0
      ? `${formatHour(new Date(Math.min(...starts)))} – ${formatHour(new Date(Math.max(...ends)))}`
      : null;

  return (
    <aside
      aria-label="Day summary"
      className="order-1 min-w-0 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] xl:order-2 xl:sticky xl:top-[4.5rem] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      {items.length === 0 ? (
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"
          >
            <Sun size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Wide open</p>
            <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              Nothing scheduled. Double-click any slot in the grid — or press New event — to plan
              something.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Day summary
            </h2>
            <dl className="mt-2.5 grid grid-cols-3 gap-2">
              {[
                { label: "Events", value: String(events.length) },
                { label: "Tasks", value: String(tasks.length) },
                { label: "Planned", value: `${hours}h ${mins}m` },
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
            {span ? (
              <p className="mt-2 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                Busy {span}
              </p>
            ) : null}
          </div>
          {allDay.length > 0 ? (
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
                All-day ({allDay.length})
              </h3>
              <ul className="mt-1.5 grid gap-1">
                {allDay.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className={cx(
                        "w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                        item.kind === "task"
                          ? "bg-amber-100/70 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-950"
                          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200/70 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
                      )}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <CalendarCheck2 size={13} aria-hidden="true" />
            Drag blocks to reschedule · double-click to create
          </p>
        </div>
      )}
    </aside>
  );
}
