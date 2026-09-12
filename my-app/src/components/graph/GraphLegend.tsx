"use client";

export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-[11px] leading-none tracking-wide text-zinc-500 dark:border-zinc-900 dark:text-zinc-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" aria-hidden="true" />
        Selected
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden="true" />
        In chain
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-[2px] w-5 bg-zinc-300" aria-hidden="true" />
        Dependency
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        Blocked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded bg-zinc-900 px-1 py-0.5 text-[9px] font-medium text-white dark:bg-white dark:text-zinc-900">CRITICAL</span>
        Critical
      </span>
    </div>
  );
}
