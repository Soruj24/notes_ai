/** Calendar grid math. Monday-first, dependency-free. */

export interface CalendarDay {
  date: Date;
  outside: boolean;
  today: boolean;
}

export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months, 1);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date, now = new Date()): boolean {
  return isSameDay(date, now);
}

/** 42 cells (6 weeks) covering the month view, Monday-first. */
export function monthGrid(month: Date, now = new Date()): CalendarDay[] {
  const first = startOfMonth(month);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      date,
      outside: date.getMonth() !== month.getMonth(),
      today: isSameDay(date, now),
    };
  });
}

export function monthLabel(month: Date): string {
  return month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function clampDay(date: Date, min?: Date, max?: Date): Date {
  if (min && date.getTime() < startOfDay(min).getTime()) return new Date(min);
  if (max && date.getTime() > endOfDay(max).getTime()) return new Date(max);
  return date;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isDisabledDay(
  date: Date,
  options: { minDate?: Date; maxDate?: Date; disabledDates?: Date[] },
): boolean {
  const t = startOfDay(date).getTime();
  if (options.minDate && t < startOfDay(options.minDate).getTime()) return true;
  if (options.maxDate && t > startOfDay(options.maxDate).getTime()) return true;
  if (options.disabledDates?.some((d) => startOfDay(d).getTime() === t)) return true;
  return false;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
