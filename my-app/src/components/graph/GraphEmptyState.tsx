"use client";

import { Network } from "lucide-react";

export function GraphEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="rounded-full border border-zinc-200 p-3 dark:border-zinc-800">
        <Network size={16} className="text-zinc-400" strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-[13px] font-medium tracking-tight text-zinc-900 dark:text-zinc-100">No dependencies</h3>
      <p className="mt-1 max-w-[28ch] text-xs leading-5 text-zinc-500">Link tasks to shape execution order. Blocked, ready, and critical paths appear automatically.</p>
      {onCreate ? (
        <button onClick={onCreate} className="mt-4 h-7 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
          Create dependency
        </button>
      ) : null}
    </div>
  );
}
