import type { CalendarView, DateRange } from "@/src/lib/scheduling/types";

/** View ranges. Weeks start Monday; month grids always cover full weeks. */

export function dayRange(date: Date): DateRange {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function weekRange(date: Date): DateRange {
  const day = (date.getDay() + 6) % 7; // Monday = 0
  const from = new Date(date);
  from.setDate(date.getDate() - day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function monthGridRange(date: Date): DateRange {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = (first.getDay() + 6) % 7;
  const from = new Date(first);
  from.setDate(first.getDate() - day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 41);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function agendaRange(date: Date, days = 14): DateRange {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + days - 1);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function rangeForView(view: CalendarView, date: Date): DateRange {
  switch (view) {
    case "day":
      return dayRange(date);
    case "week":
      return weekRange(date);
    case "month":
      return monthGridRange(date);
    default:
      return agendaRange(date);
  }
}

/** YYYY-MM-DD key for grouping items by day. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
