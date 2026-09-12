"use client";

import { Network } from "lucide-react";

export function GraphEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
        <Network size={20} className="text-zinc-400" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">No dependencies yet</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Create a dependency to link tasks. The graph will show blocked, ready, and critical paths.
      </p>
      {onCreate ? (
        <button
          onClick={onCreate}
          className="mt-4 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
        >
          Create dependency
        </button>
      ) : null}
    </div>
  );
}
