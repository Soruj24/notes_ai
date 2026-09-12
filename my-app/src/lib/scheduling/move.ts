import type { ScheduleItemDTO } from "@/src/components/calendar/types";

/**
 * Drag-and-drop rescheduling. Computes API patches that preserve durations
 * (timed drops) or clock times (all-day/month drops). Shared by every view.
 */

export interface MoveTarget {
  day: Date;
  /** Minutes since midnight; undefined = keep clock times (all-day drop). */
  minutes?: number;
}

function atDay(day: Date, minutes: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function sameTimeOn(date: Date, day: Date): Date {
  const d = new Date(day);
  d.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return d;
}

/** PATCH body for moving an event or task. Null when nothing changes. */
export function movePatch(
  item: Pick<ScheduleItemDTO, "kind" | "start" | "end" | "allDay">,
  target: MoveTarget,
): Record<string, unknown> | null {
  const start = new Date(item.start);
  const end = new Date(item.end);
  const durationMs = Math.max(0, end.getTime() - start.getTime());

  if (item.kind === "event") {
    if (target.minutes === undefined) {
      const nextStart = sameTimeOn(start, target.day);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      if (nextStart.getTime() === start.getTime()) return null;
      return {
        startsAt: nextStart.toISOString(),
        endsAt: nextEnd.toISOString(),
      };
    }
    const nextStart = atDay(target.day, target.minutes);
    if (nextStart.getTime() === start.getTime() && !item.allDay) return null;
    return {
      startsAt: nextStart.toISOString(),
      endsAt: new Date(nextStart.getTime() + durationMs).toISOString(),
      allDay: false,
    };
  }

  // Tasks move by deadline; a start time shifts by the same delta when present.
  if (target.minutes === undefined) {
    const nextDue = sameTimeOn(end, target.day);
    if (nextDue.getTime() === end.getTime()) return null;
    return { dueAt: nextDue.toISOString() };
  }
  const nextEnd = atDay(target.day, target.minutes);
  if (nextEnd.getTime() === end.getTime()) return null;
  const patch: Record<string, unknown> = { dueAt: nextEnd.toISOString() };
  const delta = nextEnd.getTime() - end.getTime();
  if (item.start) {
    patch.startAt = new Date(new Date(item.start).getTime() + delta).toISOString();
  }
  return patch;
}

/** Serialize a drag payload for dataTransfer. */
export function encodeDrag(item: ScheduleItemDTO): string {
  return JSON.stringify({
    kind: item.kind,
    sourceId: item.sourceId,
    start: new Date(item.start).toISOString(),
    end: new Date(item.end).toISOString(),
    allDay: item.allDay,
  });
}

export function decodeDrag(raw: string): {
  kind: "event" | "task";
  sourceId: string;
  start: string;
  end: string;
  allDay: boolean;
} | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      (parsed.kind === "event" || parsed.kind === "task") &&
      typeof parsed.sourceId === "string" &&
      typeof parsed.start === "string" &&
      typeof parsed.end === "string"
    ) {
      return {
        kind: parsed.kind,
        sourceId: parsed.sourceId,
        start: parsed.start,
        end: parsed.end,
        allDay: parsed.allDay === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}
