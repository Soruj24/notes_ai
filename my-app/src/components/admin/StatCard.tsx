import type { LucideIcon } from "lucide-react";

/** Dense metric card for the console overview. Server-safe. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <Icon size={14} aria-hidden="true" className="shrink-0" />
        <p className="truncate text-xs font-medium tracking-wide uppercase">{label}</p>
      </div>
      <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
