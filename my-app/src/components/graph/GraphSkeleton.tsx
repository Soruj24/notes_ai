"use client";

export function GraphSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex gap-2">
        <div className="h-8 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-8 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="ml-auto h-8 w-28 rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="h-[420px] rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
