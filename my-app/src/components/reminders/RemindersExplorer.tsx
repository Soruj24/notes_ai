"use client";

import { useMemo, useState } from "react";
import { AlarmClock, BellRing, Check, MoonStar, Plus, Repeat, X } from "lucide-react";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Input } from "@/src/components/ui/input";
import { RecurrencePicker } from "@/src/components/scheduling/RecurrencePicker";
import { frequencyToValue } from "@/src/lib/recurrence/types";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";
import {
  useCreateReminderMutation,
  useDeleteReminderMutation,
  useListRemindersQuery,
  useUpdateReminderMutation,
  type ReminderDTO,
} from "@/src/store/remindersApi";
import { cx } from "@/src/lib/utils/cx";

type Filter = "pending" | "sent" | "dismissed" | "all";

const filters: Filter[] = ["pending", "sent", "dismissed", "all"];

const statusTone: Record<string, BadgeTone> = {
  pending: "accent",
  snoozed: "warning",
  sent: "success",
  dismissed: "neutral",
};

function formatWhen(value: string | Date): { text: string; overdue: boolean } {
  const date = new Date(value);
  const text = date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return { text, overdue: date.getTime() < Date.now() };
}

/** Reminder inbox: create, snooze, dismiss, delete. */
export function RemindersExplorer({ wid }: { wid: string }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState("none");
  const { data, isLoading, isError, refetch } = useListRemindersQuery({
    wid,
    status: filter === "all" ? undefined : filter,
  });
  const [createReminder, { isLoading: creating }] = useCreateReminderMutation();
  const [updateReminder] = useUpdateReminderMutation();
  const [deleteReminder] = useDeleteReminderMutation();

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !when) return;
    try {
      await createReminder({
        wid,
        body: {
          title: title.trim(),
          remindAt: when.toISOString(),
          recurrence,
        },
      }).unwrap();
      setTitle("");
      setWhen(null);
      setRecurrence("none");
    } catch {
      toast("Could not create the reminder.", { tone: "danger" });
    }
  }

  async function mutate(id: string, body: Record<string, unknown>, error: string) {
    try {
      await updateReminder({ wid, id, body }).unwrap();
    } catch {
      toast(error, { tone: "danger" });
    }
  }

  function snoozeTomorrow(reminder: ReminderDTO) {
    const next = new Date(reminder.remindAt);
    next.setDate(next.getDate() + 1);
    void mutate(reminder.id, { remindAt: next.toISOString(), status: "pending", snoozedUntil: next.toISOString() }, "Could not snooze.");
  }

  function onDelete(id: string) {
    void deleteReminder({ wid, id })
      .unwrap()
      .catch(() => toast("Could not delete.", { tone: "danger" }));
  }

  const [now] = useState(() => Date.now());
  const { missed, upcoming } = useMemo(() => {
    const list = data ?? [];
    const isMissed = (r: ReminderDTO) =>
      (r.status === "pending" || r.status === "snoozed") &&
      new Date(r.remindAt).getTime() < now;
    return {
      missed: list.filter(isMissed),
      upcoming: list.filter((r) => !isMissed(r)),
    };
  }, [data, now]);
  const groupable = filter === "pending" || filter === "all";

  function row(reminder: ReminderDTO, highlight: boolean) {
    const when = formatWhen(reminder.remindAt);
    const actionable = reminder.status === "pending" || reminder.status === "snoozed";
    return (
      <li
        key={reminder.id}
        className={cx(
          "flex items-center gap-2.5 rounded-xl border bg-white p-3 transition-[border-color,box-shadow] hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)] focus-within:border-indigo-400 sm:gap-3 sm:px-4 dark:bg-zinc-950 dark:focus-within:border-indigo-400",
          highlight
            ? "border-red-300 hover:border-red-400 dark:border-red-900/70 dark:hover:border-red-800"
            : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
              : "bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300",
          )}
        >
          <BellRing size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{reminder.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className={highlight ? "font-semibold text-red-600 tabular-nums dark:text-red-400" : "text-zinc-500 tabular-nums dark:text-zinc-400"}>
              {highlight ? `Missed · ${when.text}` : when.text}
            </span>
            {reminder.recurrence !== "none" ? (
              <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                <Repeat size={11} aria-hidden="true" /> {reminder.recurrence}
              </span>
            ) : null}
          </p>
        </div>
        <Badge size="sm" tone={statusTone[reminder.status] ?? "neutral"} className="hidden shrink-0 sm:inline-flex">
          {reminder.status}
        </Badge>
        {actionable ? (
          <span className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => snoozeTomorrow(reminder)}
              aria-label={`Snooze ${reminder.title} to tomorrow`}
              className="max-sm:h-8 max-sm:px-2.5"
            >
              <MoonStar size={13} aria-hidden="true" />
              <span className="max-md:hidden">Snooze</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void mutate(reminder.id, { status: "dismissed" }, "Could not dismiss.")}
              aria-label={`Dismiss ${reminder.title}`}
              className="max-sm:h-8 max-sm:px-2.5"
            >
              <Check size={13} aria-hidden="true" />
              <span className="max-md:hidden">Dismiss</span>
            </Button>
          </span>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(reminder.id)}
          aria-label={`Delete ${reminder.title}`}
          className="h-8 w-8 shrink-0 hover:text-red-600 dark:hover:text-red-400"
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </li>
    );
  }

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Reminders
            </h1>
            {!isLoading && data ? (
              <span
                aria-label={`${missed.length} missed reminders`}
                className={cx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  missed.length > 0
                    ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
                )}
              >
                {missed.length > 0 ? `${missed.length} missed` : `${data.length} total`}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Nudges that fire on time — snooze, dismiss, or let series repeat.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => void onCreate(e)}
        aria-label="Create a reminder"
        className="grid gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <Input
          id="reminder-title"
          label="Remind me to…"
          placeholder="Call the dentist, water the plants…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <DateTimePicker
            label="Remind at"
            value={when}
            onChange={setWhen}
            placeholder="Pick date & time"
            className="min-w-0 flex-1 sm:max-w-64"
          />
          <RecurrencePicker
            label="Repeat"
            compact
            value={frequencyToValue(recurrence)}
            onChange={(next) => setRecurrence(next.frequency)}
          />
          <Button type="submit" disabled={creating || !title.trim() || !when} className="shrink-0">
            <Plus size={15} aria-hidden="true" />
            {creating ? "Adding…" : "Add reminder"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span
          className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 max-sm:w-full sm:w-auto dark:bg-zinc-900"
          role="tablist"
          aria-label="Reminder status filter"
        >
          {filters.map((f) => {
            const selected = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {f}
              </button>
            );
          })}
        </span>
        {!isLoading && data ? (
          <p aria-live="polite" className="text-xs text-zinc-400 tabular-nums sm:ml-auto dark:text-zinc-500">
            {data.length} {data.length === 1 ? "reminder" : "reminders"}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading reminders">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Skeleton tone="circle" className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-1/2 rounded-md" />
                <Skeleton tone="text" className="mt-1.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError || !data ? (
        <div className="grid gap-2 rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Could not load reminders</p>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            Check your connection and try again.
          </p>
          <div>
            <Button size="sm" onClick={() => refetch()} className="mt-1">
              Retry
            </Button>
          </div>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<AlarmClock size={20} aria-hidden="true" />}
          title={filter === "pending" ? "All clear — nothing pending" : `Nothing ${filter}`}
          description="Create one above — recurring series roll forward automatically after firing."
        />
      ) : groupable && missed.length > 0 ? (
        <div className="grid gap-5">
          <section aria-label="Missed reminders" className="grid gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-red-600 uppercase dark:text-red-400">
              Needs attention
              <span className="rounded-full bg-red-50 px-1.5 py-px text-[11px] font-bold tabular-nums dark:bg-red-950/60">
                {missed.length}
              </span>
            </h2>
            <ul className="grid gap-2">{missed.map((r) => row(r, true))}</ul>
          </section>
          {upcoming.length > 0 ? (
            <section aria-label="Upcoming reminders" className="grid gap-2">
              <h2 className="text-xs font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
                Upcoming
              </h2>
              <ul className="grid gap-2">{upcoming.map((r) => row(r, false))}</ul>
            </section>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-2">{data.map((r) => row(r, false))}</ul>
      )}
    </div>
  );
}
