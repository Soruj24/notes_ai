import type { CalendarView } from "@/src/lib/scheduling/types";

/** Calendar UI DTOs (API JSON: dates arrive as ISO strings). */

export interface EventDTO {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description?: string;
  startsAt: string | Date;
  endsAt: string | Date;
  allDay: boolean;
  recurrence: string;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | Date;
  location?: string;
  projectId?: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ScheduleItemDTO {
  key: string;
  kind: "event" | "task";
  sourceId: string;
  title: string;
  start: string | Date;
  end: string | Date;
  allDay: boolean;
  status: string;
  projectId?: string;
  isRecurringInstance?: boolean;
}

export interface ScheduleDTO {
  items: ScheduleItemDTO[];
  counts: { events: number; tasks: number };
  range: { from: string; to: string };
}

export interface LinkOption {
  id: string;
  label: string;
}

export type { CalendarView };

export const VIEW_TITLES: Record<CalendarView, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  agenda: "Agenda",
};

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatHour(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: date.getMinutes() ? "2-digit" : undefined,
  });
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}
