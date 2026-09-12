"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";
import { DayPlanner } from "@/src/components/planner/DayPlanner";
import { WeekPlanner } from "@/src/components/planner/WeekPlanner";
import { cx } from "@/src/lib/utils/cx";

type PlannerTab = "day" | "week";

interface PlannerViewProps {
  wid: string;
  initialDate: string;
  initialTab: PlannerTab;
}

const TABS: Array<{ id: PlannerTab; label: string; hint: string; icon: typeof CalendarDays }> = [
  { id: "day", label: "Day", hint: "Plan a single focused day", icon: CalendarDays },
  { id: "week", label: "Week", hint: "Plan Monday to Sunday", icon: CalendarRange },
];

/** Day / week tabs sharing one planner route. */
export function PlannerView({ wid, initialDate, initialTab }: PlannerViewProps) {
  const [tab, setTab] = useState<PlannerTab>(initialTab);
  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            Preview first · apply when ready
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px] sm:leading-9 dark:text-zinc-50">
            Planner
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Build a draft schedule from your tasks — nothing changes until you confirm Apply Plan.
          </p>
        </div>
        <div
          className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 sm:w-72 dark:bg-zinc-900"
          role="tablist"
          aria-label="Planner scope"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                title={t.hint}
                onClick={() => setTab(t.id)}
                className={cx(
                  "flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "day" ? (
        <DayPlanner wid={wid} initialDate={initialDate} />
      ) : (
        <WeekPlanner wid={wid} initialDate={initialDate} />
      )}
    </div>
  );
}
