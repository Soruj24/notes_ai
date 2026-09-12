"use client";

export interface ChartBucket {
  date: string;
  value: number;
}

function shortLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", timeZone: "UTC" });
}

/**
 * Dependency-free bar chart (pure CSS). Values come from server-side
 * aggregations; this component only renders them.
 */
export function BarChart({
  buckets,
  label,
  tone = "bg-zinc-900 dark:bg-zinc-100",
}: {
  buckets: ChartBucket[];
  label: string;
  tone?: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div>
      <ul aria-label={label} className="flex h-28 items-end gap-1">
        {buckets.map((b) => (
          <li
            key={b.date}
            title={`${b.date}: ${b.value.toLocaleString()}`}
            className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch"
          >
            <span className="sr-only">{`${b.date}: ${b.value}`}</span>
            <span
              aria-hidden="true"
              style={{ height: `${Math.max(b.value > 0 ? 6 : 2, Math.round((b.value / max) * 100))}%` }}
              className={`w-full rounded-sm ${b.value > 0 ? tone : "bg-zinc-200 dark:bg-zinc-800"}`}
            />
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{buckets.length ? shortLabel(buckets[0].date) : "—"}</span>
        <span>{buckets.length ? shortLabel(buckets[buckets.length - 1].date) : "—"}</span>
      </div>
    </div>
  );
}
