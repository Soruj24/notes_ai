"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Check, X } from "lucide-react";
import type { PlannedItemDTO } from "@/src/components/planner/types";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { OptionMenu } from "@/src/components/ui/option-menu";
import { Skeleton } from "@/src/components/ui/skeleton";
import { TimeField } from "@/src/components/ui/time-field";
import { useToast } from "@/src/components/ui/toast";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface WeekDayDTO {
  weekday: string;
  date: string | Date;
  blocks: Array<{ name: string; items: PlannedItemDTO[] }>;
}

export interface WeekPlanDTO {
  weekStart: string | Date;
  days: WeekDayDTO[];
  unscheduled: Array<{ taskId: string; title: string; reason: string }>;
  summary: { scheduled: number; minutes: number; overdueCleared: number };
  capacityPerDay: number;
}

interface WeekPlannerProps {
  wid: string;
  initialDate: string;
}

interface ItemEdit {
  start: string;
  durationMin: number;
}

function toTimeInput(value: string | Date): string {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function applyTimeToDay(day: string | Date, time: string): string {
  const d = new Date(day);
  const [h, m] = time.split(":").map(Number);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}

/**
 * Editable weekly preview. Items can be retimed, shortened, or rejected;
 * Reject discards the whole preview. Only [Apply Plan] (confirmed) writes.
 */
export function WeekPlanner({ wid, initialDate }: WeekPlannerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState(initialDate.slice(0, 10));
  const [plan, setPlan] = useState<WeekPlanDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [applied, setApplied] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});

  async function loadPreview(nextDate = date) {
    if (!nextDate) return;
    setLoading(true);
    setApplied(false);
    setRemoved(new Set());
    setEdits({});
    try {
      const res = await fetch(
        `/api/workspaces/${wid}/planner/week?date=${encodeURIComponent(nextDate)}`,
      );
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { plan: WeekPlanDTO };
      setPlan(json.plan);
    } catch {
      toast("Could not build the weekly plan.", { tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  function editItem(taskId: string, patch: Partial<ItemEdit>, fallback: ItemEdit) {
    setEdits((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? fallback), ...patch },
    }));
  }

  function liveItems(): Array<{ taskId: string; start: string; durationMin: number }> {
    if (!plan) return [];
    const out: Array<{ taskId: string; start: string; durationMin: number }> = [];
    for (const day of plan.days) {
      for (const block of day.blocks) {
        for (const item of block.items) {
          if (removed.has(item.taskId)) continue;
          const edit = edits[item.taskId];
          out.push({
            taskId: item.taskId,
            start: edit
              ? applyTimeToDay(day.date, edit.start)
              : new Date(item.start).toISOString(),
            durationMin: edit?.durationMin ?? item.durationMin,
          });
        }
      }
    }
    return out;
  }

  async function apply() {
    setConfirmApply(false);
    setApplying(true);
    try {
      const res = await fetch(`/api/workspaces/${wid}/planner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: liveItems() }),
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

  const pending = liveItems().length;
  const hours = plan ? Math.floor(plan.summary.minutes / 60) : 0;
  const mins = plan ? plan.summary.minutes % 60 : 0;

  return (
    <div className="grid gap-4 sm:gap-5">
      <section
        aria-label="Choose a week"
        className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">1</span>
              Choose a week
            </h2>
            <DateTimePicker
              label="Week of"
              value={date ? new Date(`${date}T12:00:00`) : null}
              withTime={false}
              onChange={(next) => {
                setDate(next ? toDateKey(next) : "");
                setPlan(null);
              }}
              className="mt-3 w-full sm:w-48"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <h2 className="sr-only">Preview</h2>
            <Button
              variant="outline"
              onClick={() => pickToday()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              This week
            </Button>
            <Button
              onClick={() => void loadPreview()}
              disabled={loading || !date}
              className="w-full sm:w-auto"
            >
              {loading ? "Planning…" : plan ? "Refresh preview" : "Preview week"}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Building weekly plan">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Skeleton tone="text" className="w-24" />
              <Skeleton className="mt-3 h-24 w-full" />
              <Skeleton className="mt-2 h-24 w-full" />
            </div>
          ))}
        </div>
      ) : !plan ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <CalendarRange size={22} />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            No weekly preview yet
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Pick a week above to draft Monday to Sunday — nothing changes until you apply it.
          </p>
        </div>
      ) : (
        <>
          <section
            aria-label="Week summary"
            className="flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Week of{" "}
                {new Date(plan.weekStart).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {applied ? <Badge tone="success">Applied</Badge> : <Badge tone="accent">Draft — not applied</Badge>}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Scheduled", value: String(pending) },
                { label: "Planned time", value: `${hours}h ${mins}m` },
                { label: "Overdue clearing", value: String(plan.summary.overdueCleared) },
                { label: "Capacity / day", value: `${plan.capacityPerDay}m` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60"
                >
                  <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plan.days.map((day) => {
              const items = day.blocks.flatMap((b) =>
                b.items.map((item) => ({ block: b.name, item })),
              );
              const visible = items.filter((e) => !removed.has(e.item.taskId));
              const dayMinutes = visible.reduce(
                (n, e) => n + (edits[e.item.taskId]?.durationMin ?? e.item.durationMin),
                0,
              );
              return (
                <section
                  key={day.weekday}
                  aria-label={`${day.weekday} plan`}
                  className="min-w-0 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
                >
                  <div className="flex items-baseline gap-2">
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {day.weekday}{" "}
                      <span className="font-normal text-zinc-500 tabular-nums dark:text-zinc-400">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </h2>
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums dark:text-zinc-500">
                      {visible.length} · {dayMinutes}m
                    </span>
                  </div>
                  {visible.length === 0 ? (
                    <p className="mt-2.5 rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                      Open — nothing scheduled.
                    </p>
                  ) : (
                    <ul className="mt-2.5 grid gap-2">
                      {visible.map(({ block, item }) => {
                        const edit = edits[item.taskId];
                        return (
                          <li
                            key={item.taskId}
                            className="grid gap-2 rounded-lg border border-zinc-200/80 p-2.5 dark:border-zinc-800/80"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {item.title}
                              </span>
                              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                                {block}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRemoved((prev) => new Set(prev).add(item.taskId))
                                }
                                aria-label={`Remove ${item.title} from plan`}
                                title={`Remove ${item.title}`}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                              >
                                <X size={14} aria-hidden="true" />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <TimeField
                                label={`Start time for ${item.title}`}
                                value={edit?.start ?? toTimeInput(item.start)}
                                onChange={(start) =>
                                  editItem(
                                    item.taskId,
                                    { start },
                                    { start: toTimeInput(item.start), durationMin: item.durationMin },
                                  )
                                }
                              />
                              <OptionMenu
                                label={`Duration for ${item.title}`}
                                value={edit?.durationMin ?? item.durationMin}
                                options={[15, 30, 45, 60, 90, 120].map((m) => ({
                                  value: m,
                                  label: `${m}m`,
                                }))}
                                onChange={(durationMin) =>
                                  editItem(
                                    item.taskId,
                                    { durationMin },
                                    { start: toTimeInput(item.start), durationMin: item.durationMin },
                                  )
                                }
                              />
                              {edit ? (
                                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
                                  Edited
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{item.reason}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          {plan.unscheduled.length > 0 ? (
            <section
              aria-label="Unscheduled tasks"
              className="rounded-xl border border-amber-600/25 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-400/20 dark:bg-amber-950/40"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Beyond this week ({plan.unscheduled.length})
              </h2>
              <ul className="mt-2.5 grid gap-1.5 text-sm">
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
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Review & apply.</span>{" "}
                {pending} tasks get new start times; rejected items stay untouched.
              </p>
              <div className="flex shrink-0 gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlan(null);
                    setRemoved(new Set());
                    setEdits({});
                  }}
                >
                  Reject
                </Button>
                <Button onClick={() => setConfirmApply(true)} disabled={applying || pending === 0 || applied}>
                  {applying ? "Applying…" : applied ? (
                    <span className="inline-flex items-center gap-1.5">
                      Plan applied <Check size={14} aria-hidden="true" />
                    </span>
                  ) : `Apply · ${pending}`}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        title="Apply this week?"
        description={`${pending} tasks will get new start times across the week. Deadlines and priorities stay untouched.`}
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
        <p className="text-sm text-zinc-500">Rejected items stay exactly as they were.</p>
      </Dialog>
    </div>
  );

  function pickToday() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    setDate(toDateKey(monday));
    setPlan(null);
  }
}
