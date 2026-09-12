"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { AnalyticsData } from "@/src/store/analyticsApi";
import { cx } from "@/src/lib/utils/cx";

/** CSS bar chart of completions per day (CSS-only, no chart lib). */
export function DailyChart({ data }: { data: AnalyticsData }) {
  const [metric, setMetric] = useState<"completed" | "focusMin">("completed");
  const max = Math.max(1, ...data.daily.map((d) => d[metric]));
  const [todayKey] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const total = useMemo(() => data.daily.reduce((n, d) => n + d[metric], 0), [data, metric]);
  const empty = data.daily.every((d) => d[metric] === 0);
  return (
    <section
      aria-label="Daily productivity"
      className="min-w-0 rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
        >
          <BarChart3 size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Daily productivity
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {empty ? "No activity yet" : `${total} ${metric === "completed" ? "completions" : "minutes"} in range`}
          </p>
        </div>
        <span className="ml-auto grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" role="tablist" aria-label="Chart metric">
          {(["completed", "focusMin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={cx(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                metric === m
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              {m === "completed" ? "Done" : "Focus"}
            </button>
          ))}
        </span>
      </div>
      {empty ? (
        <div className="rounded-lg bg-zinc-50 px-4 py-8 text-center dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Quiet so far</p>
          <p className="mx-auto mt-0.5 max-w-xs text-[13px] text-zinc-500 dark:text-zinc-400">
            Complete tasks to light up this chart — it fills in as you work.
          </p>
        </div>
      ) : (
        <div
          className="flex items-end gap-1 sm:gap-1.5"
          role="img"
          aria-label={`Daily ${metric} bar chart, ${total} total`}
        >
          {data.daily.map((day) => {
            const value = day[metric];
            const isToday = day.date.slice(0, 10) === todayKey;
            const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
              month: "numeric",
              day: "numeric",
            });
            return (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="h-4 text-[11px] font-semibold text-zinc-600 tabular-nums dark:text-zinc-400">
                  {value > 0 ? value : ""}
                </span>
                <div
                  className={cx(
                    "w-full rounded-t-md rounded-b-sm transition-[height]",
                    value > 0
                      ? isToday
                        ? "bg-indigo-600 dark:bg-indigo-400"
                        : "bg-zinc-900 dark:bg-zinc-100"
                      : "bg-zinc-100 dark:bg-zinc-900",
                  )}
                  style={{ height: `${Math.max(4, (value / max) * 128)}px` }}
                  title={`${label}: ${value}${metric === "focusMin" ? " min" : ""}${isToday ? " (today)" : ""}`}
                />
                <span className={cx("truncate text-[10px] tabular-nums", isToday ? "font-bold text-indigo-600 dark:text-indigo-300" : "text-zinc-400 dark:text-zinc-500")}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
