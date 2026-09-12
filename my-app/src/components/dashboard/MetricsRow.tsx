"use client";

import Link from "next/link";
import { AlertTriangle, CalendarCheck2, CheckCircle2, Gauge, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useGetInsightsQuery } from "@/src/store/dashboardApi";
import { cx } from "@/src/lib/utils/cx";

interface StatDef {
  label: string;
  caption: string;
  href: string;
  icon: LucideIcon;
  value: string;
  accent?: boolean;
  danger?: boolean;
}

/** Four productivity metrics from live workspace data. */
export function MetricsRow({ wid }: { wid: string }) {
  const { data, isLoading, isError, refetch } = useGetInsightsQuery({ wid });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading metrics">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Skeleton className="h-7 w-14" />
            <Skeleton tone="text" className="mt-2.5 w-24" />
            <Skeleton tone="text" className="mt-1.5 w-16" />
          </div>
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-white p-4 text-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-zinc-600 dark:text-zinc-400">Could not load today&apos;s metrics.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex h-8 shrink-0 items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:ml-auto dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats: StatDef[] = [
    {
      label: "Due today",
      caption: "Needs action",
      href: "/tasks/today",
      icon: CalendarCheck2,
      value: String(data.metrics.dueToday),
      accent: true,
    },
    {
      label: "Done today",
      caption: "Completed",
      href: "/tasks/completed",
      icon: CheckCircle2,
      value: String(data.metrics.doneToday),
    },
    {
      label: "Overdue",
      caption: data.metrics.overdue > 0 ? "Needs triage" : "All clear",
      href: "/tasks/overdue",
      icon: AlertTriangle,
      value: String(data.metrics.overdue),
      danger: data.metrics.overdue > 0,
    },
    {
      label: "Completion",
      caption: "7-day rate",
      href: "/analytics",
      icon: Gauge,
      value: `${data.metrics.completionRate}%`,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow,transform] hover:border-zinc-300 hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-px dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  s.danger
                    ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                    : s.accent
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
                )}
              >
                <Icon size={16} />
              </span>
              <span
                className={cx(
                  "text-2xl font-semibold tracking-tight tabular-nums",
                  s.danger ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50",
                )}
              >
                {s.value}
              </span>
            </div>
            <dt className="mt-3 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{s.label}</dt>
            <dd className="text-xs text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400">{s.caption}</dd>
          </Link>
        );
      })}
    </dl>
  );
}
