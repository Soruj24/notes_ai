import type { ReactNode } from "react";
import { ProgressBar } from "@/src/components/ui/progress";

interface BreakdownRow {
  id: string;
  label: string;
  done: number;
  total: number;
}

interface BreakdownProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  rows: BreakdownRow[];
  emptyText: string;
}

/** Reusable done/total bar list (priorities, projects, …). */
export function Breakdown({ title, description, icon, rows, emptyText }: BreakdownProps) {
  const visible = rows.filter((r) => r.total > 0);
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="mb-4 flex items-center gap-2.5">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
          {description ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          {emptyText}
        </p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((row) => {
            const percent = Math.round((row.done / row.total) * 100);
            return (
              <li key={row.id}>
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-800 capitalize dark:text-zinc-200">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {row.done}/{row.total} · {percent}%
                  </span>
                </div>
                <ProgressBar value={percent} label={`${row.label} progress`} className="mt-1.5" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
