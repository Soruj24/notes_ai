"use client";

import { Sparkles } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useGetInsightsQuery } from "@/src/store/dashboardApi";
import { cx } from "@/src/lib/utils/cx";

const tones: Record<string, string> = {
  success: "border-emerald-600/20 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-950/40",
  warning: "border-amber-600/25 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-950/40",
  danger: "border-red-600/20 bg-red-50/70 dark:border-red-400/20 dark:bg-red-950/40",
  info: "border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60",
};

/** Rule-based insights. Shares the cached insights request with MetricsRow. */
export function InsightsPanel({ wid }: { wid: string }) {
  const { data, isLoading } = useGetInsightsQuery({ wid });

  return (
    <DashboardSection
      title="Signals"
      description="Patterns worth a look — automatically detected"
      icon={<Sparkles size={16} aria-hidden="true" />}
      actionHref="/analytics"
      actionLabel="Analytics"
    >
      {isLoading || !data ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading insights">
          <Skeleton className="h-[68px] w-full" />
          <Skeleton className="h-[68px] w-full" />
        </div>
      ) : data.insights.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All quiet</p>
          <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            New patterns will surface here as you complete tasks and schedule time.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {data.insights.slice(0, 4).map((insight) => (
            <li
              key={insight.id}
              className={cx("rounded-lg border p-3.5", tones[insight.tone] ?? tones.info)}
            >
              <p className="text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-50">{insight.title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">{insight.body}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
