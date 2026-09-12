import { Settings } from "lucide-react";

/** Collapsible raw tool record. Transparency without clutter. */
export function AIToolResult({ name, summary }: { name: string; summary: string }) {
  return (
    <details className="rounded-lg bg-zinc-100/70 text-xs dark:bg-zinc-900">
      <summary className="flex cursor-pointer items-center gap-1.5 truncate px-2.5 py-1.5 text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-300">
        <Settings size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{name}</span>
      </summary>
      <p className="whitespace-pre-wrap break-words px-2.5 pb-2 text-zinc-600 dark:text-zinc-400">
        {summary}
      </p>
    </details>
  );
}
