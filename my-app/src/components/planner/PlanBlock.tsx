import { MoonStar, Sun, Sunset, type LucideIcon } from "lucide-react";
import { PlanItem } from "@/src/components/planner/PlanItem";
import type { PlanBlockDTO } from "@/src/components/planner/types";

const icons: Record<PlanBlockDTO["name"], LucideIcon> = {
  Morning: Sun,
  Afternoon: Sunset,
  Evening: MoonStar,
};

const hints: Record<PlanBlockDTO["name"], string> = {
  Morning: "8:00 – 12:00",
  Afternoon: "12:00 – 17:00",
  Evening: "17:00 – 21:00",
};

/** One day-part column with its scheduled items and block totals. */
export function PlanBlock({ block }: { block: PlanBlockDTO }) {
  const Icon = icons[block.name];
  const minutes = block.items.reduce((n, i) => n + i.durationMin, 0);
  return (
    <section
      aria-label={`${block.name} plan`}
      className="min-w-0 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
        >
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{block.name}</h2>
          <p className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">{hints[block.name]}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-zinc-900 dark:text-zinc-300">
          {block.items.length} · {minutes}m
        </span>
      </div>
      {block.items.length === 0 ? (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          Open — nothing scheduled here.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {block.items.map((item) => (
            <PlanItem key={`${item.taskId}-${String(item.start)}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
