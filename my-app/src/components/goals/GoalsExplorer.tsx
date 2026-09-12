"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Target, X } from "lucide-react";
import { GoalCard } from "@/src/components/goals/GoalCard";
import { GoalEditorDialog } from "@/src/components/goals/GoalEditorDialog";
import type { GoalDTO } from "@/src/components/projects/types";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { cx } from "@/src/lib/utils/cx";

const filters = [
  { id: "active", label: "Active" },
  { id: "all", label: "All" },
  { id: "achieved", label: "Achieved" },
  { id: "abandoned", label: "Abandoned" },
] as const;

type FilterId = (typeof filters)[number]["id"];

interface GoalsExplorerProps {
  wid: string;
  initial: GoalDTO[];
}

/** Filterable goal grid + create dialog. Server provides first paint. */
export function GoalsExplorer({ wid, initial }: GoalsExplorerProps) {
  const [filter, setFilter] = useState<FilterId>("active");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      active: 0,
      all: initial.length,
      achieved: 0,
      abandoned: 0,
    };
    for (const g of initial) {
      if (g.status === "active") c.active += 1;
      if (g.status === "achieved") c.achieved += 1;
      if (g.status === "abandoned") c.abandoned += 1;
    }
    return c;
  }, [initial]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((g) => {
      if (filter !== "all" && g.status !== filter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [initial, filter, query]);

  const searching = query.trim().length > 0;
  const activeAvg =
    counts.active === 0
      ? null
      : Math.round(
          initial
            .filter((g) => g.status === "active")
            .reduce((n, g) => n + (g.computedProgress?.percent ?? g.progress ?? 0), 0) /
            counts.active,
        );

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Goals
            </h1>
            <span
              aria-label={`${counts.active} active goals`}
              className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
            >
              {counts.active} active
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Set a direction with a daily, weekly, monthly, or yearly cadence.
            {activeAvg !== null ? ` Averaging ${activeAvg}% across active goals.` : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="ml-auto shrink-0">
          <Plus size={15} aria-hidden="true" />
          New goal
        </Button>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <span
          className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 max-lg:w-full lg:w-auto dark:bg-zinc-900"
          role="tablist"
          aria-label="Goal status filter"
        >
          {filters.map((f) => {
            const selected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f.id)}
                className={cx(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {f.label}
                <span
                  aria-label={`${counts[f.id]} ${f.label.toLowerCase()} goals`}
                  className={cx(
                    "rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums",
                    selected
                      ? "bg-zinc-900/[0.07] text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
                      : "bg-zinc-900/[0.05] text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500",
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </span>
        <div className="relative min-w-0 flex-1 lg:max-w-xs xl:ml-auto">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="goals-search"
            aria-label="Search goals"
            placeholder="Search goals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear goal search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
        {searching ? `${visible.length} of ${counts[filter]} shown` : `${visible.length} ${visible.length === 1 ? "goal" : "goals"}`}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          icon={
            searching ? (
              <Search size={20} aria-hidden="true" />
            ) : (
              <Target size={20} aria-hidden="true" />
            )
          }
          title={searching ? "No matching goals" : filter === "active" ? "No active goals" : `No ${filter} goals`}
          description={
            searching
              ? `Nothing matches “${query.trim()}”. Clear the search to browse everything.`
              : filter === "active"
                ? "Set a direction with a daily, weekly, monthly, or yearly cadence. Progress computes from linked work."
                : `Goals you ${filter === "achieved" ? "achieve" : "abandon"} will collect here.`
          }
          action={
            searching ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : filter === "active" ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus size={15} aria-hidden="true" />
                New goal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
      {dialogOpen ? (
        <GoalEditorDialog wid={wid} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      ) : null}
    </div>
  );
}
