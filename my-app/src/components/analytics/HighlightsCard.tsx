import { Sparkles } from "lucide-react";
import type { AnalyticsData } from "@/src/store/analyticsApi";

/** Auto-derived takeaways from the range data. No AI, no extra fetches. */
export function HighlightsCard({ data }: { data: AnalyticsData }) {
  const days = data.daily.filter((d) => d.completed > 0);
  const best = days.length
    ? days.reduce((a, b) => (b.completed > a.completed ? b : a))
    : null;
  const totalDone = data.daily.reduce((n, d) => n + d.completed, 0);
  const avg = data.daily.length ? (totalDone / data.daily.length).toFixed(1) : "0.0";
  const bestLabel = best
    ? new Date(`${best.date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;
  const topProject = [...data.byProject]
    .filter((p) => p.total > 0)
    .sort((a, b) => b.done - a.done)[0];

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Best day",
      value: best && bestLabel ? `${bestLabel} · ${best.completed} done` : "No completions yet",
    },
    { label: "Daily average", value: `${avg} tasks / day` },
    {
      label: "Strongest project",
      value: topProject ? `${topProject.name} · ${topProject.done}/${topProject.total}` : "No projects yet",
    },
  ];

  return (
    <section
      aria-label="Highlights"
      className="flex min-w-0 flex-col rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <Sparkles size={15} />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Highlights
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Takeaways from this range</p>
        </div>
      </div>
      <dl className="mt-4 grid flex-1 content-start gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900/60">
            <dt className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {r.label}
            </dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50" title={r.value}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
