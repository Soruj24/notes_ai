/** Shared scheduling vocabulary for Events + Tasks. Single source of truth. */

export type CalendarView = "day" | "week" | "month" | "agenda";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ScheduleItem {
  /** Stable key: `${kind}:${sourceId}:${occurrenceStartISO}`. */
  key: string;
  kind: "event" | "task";
  sourceId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status: string;
  projectId?: string;
  /** Only set on expanded recurrence instances. */
  isRecurringInstance?: boolean;
}

export interface EventLike {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  allDay: boolean;
  recurrence: string;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[] | null;
  recurrenceUntil?: Date | string | null;
  status: string;
  projectId?: string | null;
}

export interface TaskLike {
  id: string;
  title: string;
  startAt?: Date | string | null;
  dueAt?: Date | string | null;
  durationMin?: number | null;
  status: string;
  projectId?: string | null;
}
