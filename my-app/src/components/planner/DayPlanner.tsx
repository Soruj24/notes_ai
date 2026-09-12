"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { PlanBlock } from "@/src/components/planner/PlanBlock";
import type { DayPlanDTO } from "@/src/components/planner/types";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

interface DayPlannerProps {
  wid: string;
  initialDate: string;
}

/**
 * Preview-first planner. GET builds the plan without touching data;
 * [Apply Plan] (confirmed) is the only path that writes start times.
 */
export function DayPlanner({ wid, initialDate }: DayPlannerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState(initialDate.slice(0, 10));
  const [plan, setPlan] = useState<DayPlanDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [applied, setApplied] = useState(false);

  async function loadPreview(nextDate = date) {
    if (!nextDate) return;
    setLoading(true);
    setApplied(false);
    try {
      const res = await fetch(
        `/api/workspaces/${wid}/planner?date=${encodeURIComponent(nextDate)}`,
      );
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { plan: DayPlanDTO };
      setPlan(json.plan);
    } catch {
      toast("Could not build the plan.", { tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!plan) return;
    setConfirmApply(false);
    setApplying(true);
    try {
      const items = plan.blocks.flatMap((b) =>
        b.items.map((i) => ({
          taskId: i.taskId,
          start: new Date(i.start).toISOString(),
          durationMin: i.durationMin,
        })),
      );
      const res = await fetch(`/api/workspaces/${wid}/planner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { applied: number };
      setApplied(true);
      toast(`Applied — ${json.applied} tasks scheduled.`, { tone: "success" });
      router.refresh();
    } catch {
      toast("Could not apply the plan.", { tone: "danger" });
    } finally {
      setApplying(false);
    }
  }

  function pick(next: string) {
    setDate(next);
    setPlan(null);
  }

  const totalItems = plan?.blocks.reduce((n, b) => n + b.items.length, 0) ?? 0;
  const totalMinutes = plan?.blocks.reduce(
    (n, b) => n + b.items.reduce((m, i) => m + i.durationMin, 0),
    0,
  ) ?? 0;
  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "Pick a date";

  return (
    <div className="grid gap-4 sm:gap-5">
      <section
        aria-label="Choose a day"
        className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">1</span>
              Choose a day
            </h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <DateTimePicker
                label="Plan date"
                value={date ? new Date(`${date}T12:00:00`) : null}
                withTime={false}
                onChange={(next) => {
                  pick(next ? toDateKey(next) : "");
                }}
                className="w-full sm:w-48"
              />
              <div className="flex gap-1.5" role="group" aria-label="Shift day">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => date && pick(shiftKey(date, -1))}
                  disabled={!date || loading}
                  aria-label="Previous day"
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pick(toDateKey(new Date()))}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => date && pick(shiftKey(date, 1))}
                  disabled={!date || loading}
                  aria-label="Next day"
                  className="flex-1 sm:flex-none"
                >
                  Next
                  <ChevronRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 max-lg:sr-only dark:text-zinc-50">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">2</span>
              Preview
            </h2>
            <Button
              onClick={() => void loadPreview()}
              disabled={loading || !date}
              className="mt-0 w-full sm:w-auto lg:mt-3"
            >
              {loading ? "Planning…" : plan ? "Refresh preview" : "Preview plan"}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-3" aria-busy="true" aria-label="Building plan">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Skeleton tone="text" className="w-28" />
              <Skeleton className="mt-3 h-16 w-full" />
              <Skeleton className="mt-2 h-16 w-full" />
            </div>
          ))}
        </div>
      ) : !plan ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <CalendarClock size={22} />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            No preview yet
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Pick a date above and preview the plan first — {dateLabel.toLowerCase()} stays untouched until you apply it.
          </p>
        </div>
      ) : (
        <>
          <section
            aria-label="Plan summary"
            className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-white p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {new Date(plan.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                {totalItems} scheduled · {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m planned
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              {applied ? (
                <Badge tone="success">
                  <Check size={12} aria-hidden="true" />
                  Applied
                </Badge>
              ) : (
                <Badge tone="accent">Draft — not applied</Badge>
              )}
            </div>
          </section>
          <div className="grid items-start gap-3 lg:grid-cols-3">
            {plan.blocks.map((block) => (
              <PlanBlock key={block.name} block={block} />
            ))}
          </div>
          {plan.unscheduled.length > 0 ? (
            <section
              aria-label="Unscheduled tasks"
              className="rounded-xl border border-amber-600/25 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-400/20 dark:bg-amber-950/40"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Didn&apos;t fit ({plan.unscheduled.length})
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">
                These stay unscheduled — apply the plan anyway or trim another day.
              </p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {plan.unscheduled.map((u) => (
                  <li key={u.taskId} className="flex min-w-0 gap-2">
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{u.title}</span>
                    <span className="shrink-0 text-zinc-500 dark:text-zinc-400">— {u.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="sticky bottom-20 z-20 lg:bottom-6">
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950/95">
              <p className="px-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Step 3 · Review & apply.</span>{" "}
                {totalItems} tasks get new start times; deadlines stay untouched.
              </p>
              <Button
                onClick={() => setConfirmApply(true)}
                disabled={applying || totalItems === 0 || applied}
                className="shrink-0 sm:ml-auto"
              >
                {applying ? "Applying…" : applied ? (
                  <span className="inline-flex items-center gap-1.5">
                    Plan applied <Check size={14} aria-hidden="true" />
                  </span>
                ) : `Apply plan · ${totalItems}`}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        title="Apply this plan?"
        description={`${totalItems} tasks will get new start times for ${dateLabel.toLowerCase()}. Deadlines and priorities stay untouched.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmApply(false)}>
              Cancel
            </Button>
            <Button onClick={() => void apply()} disabled={applying}>
              {applying ? "Applying…" : "Apply plan"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">You can reschedule again anytime.</p>
      </Dialog>
    </div>
  );
}
