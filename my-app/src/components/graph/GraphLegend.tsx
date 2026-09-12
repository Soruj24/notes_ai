"use client";

export function GraphLegend() {
  const items = [
    { color: "bg-zinc-900 dark:bg-white", label: "Task" },
    { color: "bg-amber-500", label: "Blocked" },
    { color: "bg-emerald-500", label: "Ready" },
    { color: "bg-indigo-500", label: "Critical" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${it.color}`} />
          {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-6 bg-zinc-300 dark:bg-zinc-700" /> dependency
      </span>
    </div>
  );
}
