import type { DateRange, EventLike } from "@/src/lib/scheduling/types";

/**
 * Expand one event (single or recurring) into concrete occurrences
 * overlapping [from, to]. Supports intervals (every N units) and weekly
 * weekday sets. Caps at 366 instances as a safety bound.
 */

const MAX_INSTANCES = 366;

function intervalOf(event: EventLike): number {
  const n = event.recurrenceInterval ?? 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(99, Math.floor(n)) : 1;
}

function step(date: Date, event: EventLike): Date {
  const d = new Date(date);
  const n = intervalOf(event);
  const recurrence = event.recurrence;
  if (recurrence === "daily") d.setDate(d.getDate() + n);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + n);
  else if (recurrence === "yearly") d.setFullYear(d.getFullYear() + n);
  return d;
}

/** Next weekly occurrence on/after `from`, honoring the weekday set + interval. */
function nextWeekly(
  anchor: Date,
  from: Date,
  weekdays: number[],
  interval: number,
): Date {
  const cursor = new Date(Math.max(from.getTime(), anchor.getTime()));
  cursor.setHours(
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  );
  for (let i = 0; i < 366; i++) {
    const day = new Date(cursor);
    day.setHours(0, 0, 0, 0);
    const anchorWeek = new Date(anchor);
    anchorWeek.setHours(0, 0, 0, 0);
    const weekIndex = Math.floor((day.getTime() - anchorWeek.getTime()) / (7 * 86400000));
    if (
      cursor.getTime() >= from.getTime() &&
      weekdays.includes(cursor.getDay()) &&
      weekIndex % interval === 0
    ) {
      return cursor;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

export interface Occurrence {
  start: Date;
  end: Date;
  isRecurringInstance: boolean;
}

export function expandEvent(
  event: EventLike,
  range: DateRange,
): Occurrence[] {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const until = event.recurrenceUntil ? new Date(event.recurrenceUntil) : null;

  const out: Occurrence[] = [];
  if (!event.recurrence || event.recurrence === "none") {
    if (end.getTime() >= range.from.getTime() && start.getTime() <= range.to.getTime()) {
      out.push({ start, end, isRecurringInstance: false });
    }
    return out;
  }

  const weekdays = (event.recurrenceWeekdays ?? []).filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  const useWeekdays = event.recurrence === "weekly" && weekdays.length > 0;

  let cursor = firstWeeklyStart(start, weekdays, useWeekdays);
  for (let i = 0; i < MAX_INSTANCES; i++) {
    if (until && cursor.getTime() > until.getTime()) break;
    if (cursor.getTime() > range.to.getTime()) break;
    const occEnd = new Date(cursor.getTime() + durationMs);
    if (occEnd.getTime() >= range.from.getTime()) {
      out.push({ start: new Date(cursor), end: occEnd, isRecurringInstance: true });
    }
    const next = useWeekdays
      ? nextWeekly(start, new Date(cursor.getTime() + 60000), weekdays, intervalOf(event))
      : step(cursor, event);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
  }
  return out;
}

function firstWeeklyStart(start: Date, weekdays: number[], useWeekdays: boolean): Date {
  if (!useWeekdays) return start;
  // First occurrence on/after the series start that matches the set.
  return nextWeekly(
    start,
    new Date(start.getTime() - 1),
    weekdays,
    1,
  );
}
