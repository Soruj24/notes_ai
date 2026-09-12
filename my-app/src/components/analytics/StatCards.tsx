import { AlertTriangle, CheckCircle2, Clock3, type LucideIcon } from "lucide-react";
import { ProgressRing } from "@/src/components/ui/progress";
import type { AnalyticsData } from "@/src/store/analyticsApi";
import { cx } from "@/src/lib/utils/cx";

function formatFocus(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Headline numbers for the selected range. */
export function StatCards({ data }: { data: AnalyticsData }) {
  const cards: Array<{ label: string; caption: string; value: string; icon: LucideIcon; tone: string }> = [
    {
      label: "Completed",
      caption: "Tasks finished",
      value: String(data.completedTasks),
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      label: "Overdue now",
      caption: data.overdueTasks > 0 ? "Needs triage" : "All clear",
      value: String(data.overdueTasks),
      icon: AlertTriangle,
      tone: data.overdueTasks > 0
        ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
        : "bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400",
    },
    {
      label: "Focus time",
      caption: "Estimated",
      value: formatFocus(data.focusMin),
      icon: Clock3,
      tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const danger = c.label === "Overdue now" && data.overdueTasks > 0;
        return (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span aria-hidden="true" className={cx("flex h-8 w-8 items-center justify-center rounded-lg", c.tone)}>
                <Icon size={16} />
              </span>
              <span
                className={cx(
                  "text-2xl font-semibold tracking-tight tabular-nums",
                  danger ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50",
                )}
              >
                {c.value}
              </span>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{c.label}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.caption}</p>
          </div>
        );
      })}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <ProgressRing value={data.completionRate} label="Completion rate" />
        <div>
          <p className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">{data.completionRate}%</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Completion rate</p>
        </div>
      </div>
    </div>
  );
}
