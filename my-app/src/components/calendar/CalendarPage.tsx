"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2 } from "lucide-react";
import { AgendaView } from "@/src/components/calendar/AgendaView";
import { AgendaSummary } from "@/src/components/calendar/AgendaSummary";
import { CalendarToolbar } from "@/src/components/calendar/CalendarToolbar";
import { DaySummary } from "@/src/components/calendar/DaySummary";
import { EventEditorDialog, type EventPreset } from "@/src/components/calendar/EventEditorDialog";
import { MonthView } from "@/src/components/calendar/MonthView";
import { TimeGrid } from "@/src/components/calendar/TimeGrid";
import type {
  EventDTO,
  LinkOption,
  ScheduleItemDTO,
} from "@/src/components/calendar/types";
import { dayKey, eachDay, monthGridRange, weekRange } from "@/src/lib/scheduling/range";
import { movePatch } from "@/src/lib/scheduling/move";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";
import type { CalendarView } from "@/src/lib/scheduling/types";
import {
  useGetScheduleQuery,
  useUpdateEventMutation,
} from "@/src/store/scheduleApi";
import { tasksApi, useUpdateTaskMutation } from "@/src/store/tasksApi";
import { useAppDispatch } from "@/src/store/hooks";

interface CalendarPageProps {
  wid: string;
  view: CalendarView;
  initialDate: string;
  projects: LinkOption[];
  /**
   * Route context. The /schedule route passes context="schedule" to get its
   * own heading and overview panel; every calendar route omits it and
   * renders exactly as before.
   */
  context?: "schedule";
}

function shiftDate(date: Date, view: CalendarView, dir: 1 | -1): Date {
  const d = new Date(date);
  if (view === "day") d.setDate(d.getDate() + dir);
  else if (view === "week" || view === "agenda") d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

function titleFor(view: CalendarView, date: Date): string {
  if (view === "day") {
    return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  if (view === "month") {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const { from, to } = weekRange(date);
  const sameMonth = from.getMonth() === to.getMonth();
  return `${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${to.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })}`;
}

function ViewSkeleton({ view }: { view: CalendarView }) {
  if (view === "month") {
    return (
      <div aria-busy="true" aria-label="Loading calendar" className="overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-800">
        <div className="grid grid-cols-7 gap-px bg-zinc-100 p-px dark:bg-zinc-900">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-none sm:h-24" />
          ))}
        </div>
      </div>
    );
  }
  if (view === "agenda") {
    return (
      <div aria-busy="true" aria-label="Loading agenda" className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div aria-busy="true" aria-label="Loading schedule" className="overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-800">
      <Skeleton className="h-10 w-full rounded-none border-b border-zinc-200/60 dark:border-zinc-800" />
      <Skeleton className="h-96 w-full rounded-none" />
    </div>
  );
}

/**
 * Calendar shell: toolbar + view + editor dialog. Schedule data comes from
 * the merged RTK cache (events + tasks); mutations invalidate it.
 */
export function CalendarPage({ wid, view, initialDate, projects, context }: CalendarPageProps) {
  const isSchedule = context === "schedule";
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [date, setDate] = useState(() => new Date(initialDate));
  const [editing, setEditing] = useState<EventDTO | null>(null);
  const [preset, setPreset] = useState<EventPreset | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  const [updateEvent] = useUpdateEventMutation();
  const [updateTask] = useUpdateTaskMutation();

  const dateISO = date.toISOString();
  const { data, isLoading, isError, refetch } = useGetScheduleQuery({ wid, view, date: dateISO });
  const items = useMemo(() => data?.items ?? [], [data]);

  function go(next: Date) {
    setDate(next);
    const base = view === "week" ? "/calendar" : `/calendar/${view}`;
    router.replace(`${base}?date=${dayKey(next)}`, { scroll: false });
  }

  function openNew(presetValue?: EventPreset) {
    setEditing(null);
    setPreset(presetValue);
    setEditorOpen(true);
  }

  function openEvent(item: ScheduleItemDTO) {
    if (item.kind === "task") {
      router.push(`/tasks/${item.sourceId}`);
      return;
    }
    // Load the full series record (schedule items lack recurrence details).
    void (async () => {
      try {
        const res = await fetch(`/api/workspaces/${wid}/events/${item.sourceId}`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { event: EventDTO };
        setEditing(json.event);
        setPreset(undefined);
        setEditorOpen(true);
      } catch {
        toast("Could not open the event.", { tone: "danger" });
      }
    })();
  }

  async function onMove(item: ScheduleItemDTO, target: { day: Date; minutes?: number }) {
    const patch = movePatch(item, target);
    if (!patch) return;
    try {
      if (item.kind === "event") {
        await updateEvent({ wid, id: item.sourceId, body: patch }).unwrap();
      } else {
        await updateTask({ wid, id: item.sourceId, body: patch }).unwrap();
        dispatch(tasksApi.util.invalidateTags(["TaskLists", "TaskCounts"]));
      }
    } catch {
      toast("Could not reschedule.", { tone: "danger" });
    }
  }

  const days = useMemo(() => {
    if (view === "day") return [new Date(date)];
    const range = view === "month" ? monthGridRange(date) : weekRange(date);
    return eachDay(range.from, range.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateISO]);

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <CalendarToolbar
        view={view}
        title={titleFor(view, date)}
        onPrev={() => go(shiftDate(date, view, -1))}
        onToday={() => go(new Date())}
        onNext={() => go(shiftDate(date, view, 1))}
        onNew={() => openNew()}
        eyebrow={isSchedule ? "Schedule" : undefined}
        description={
          isSchedule
            ? "Every commitment in one chronological list — events and task deadlines together."
            : undefined
        }
      />
      {isLoading ? (
        <ViewSkeleton view={view} />
      ) : isError || !data ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <CalendarX2 size={22} />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Could not load the schedule
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Check your connection and try again — your events are safe.
          </p>
          <Button size="sm" onClick={() => refetch()} className="mt-5">
            Retry
          </Button>
        </div>
      ) : view === "month" ? (
        <MonthView
          days={days}
          items={items}
          currentMonth={date.getMonth()}
          onSelect={openEvent}
          onOpenDay={(day) => router.push(`/calendar/day?date=${dayKey(day)}`)}
          onMoveDay={(item, day) => void onMove(item, { day })}
        />
      ) : view === "agenda" ? (
        isSchedule ? (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
            <div className="order-2 min-w-0 xl:order-1">
              <AgendaView items={items} onSelect={openEvent} onNew={() => openNew()} />
            </div>
            <AgendaSummary items={items} onSelect={openEvent} />
          </div>
        ) : (
          <AgendaView items={items} onSelect={openEvent} />
        )
      ) : view === "day" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="order-2 min-w-0 xl:order-1">
            <TimeGrid
              days={days}
              items={items}
              onSelect={openEvent}
              onMove={(item, target) => void onMove(item, target)}
              onCreateSlot={(day, minutes) => {
                const start = new Date(day);
                start.setHours(0, minutes, 0, 0);
                openNew({ startsAt: start, endsAt: new Date(start.getTime() + 3600000), allDay: false });
              }}
            />
          </div>
          <DaySummary items={items} onSelect={openEvent} />
        </div>
      ) : (
        <TimeGrid
          days={days}
          items={items}
          onSelect={openEvent}
          onMove={(item, target) => void onMove(item, target)}
          onCreateSlot={(day, minutes) => {
            const start = new Date(day);
            start.setHours(0, minutes, 0, 0);
            openNew({ startsAt: start, endsAt: new Date(start.getTime() + 3600000), allDay: false });
          }}
        />
      )}
      {editorOpen ? (
        <EventEditorDialog
          key={editing ? `edit-${editing.id}` : `new-${preset?.startsAt.getTime() ?? "blank"}`}
          wid={wid}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          event={editing}
          preset={preset}
          projects={projects}
        />
      ) : null}
    </div>
  );
}
