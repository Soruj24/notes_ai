import type { Recurrence } from "@/src/lib/db/enums";

/** Day-boundary + recurrence helpers (UTC-safe, dependency-free). */

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

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Advance a date by one recurrence step. Returns null for "none". */
export function advanceRecurrence(from: Date, recurrence: Recurrence): Date | null {
  const d = new Date(from);
  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      return d;
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
    default:
      return null;
  }
}

const ACTIVE_STATUSES = ["todo", "in_progress"];

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Overdue: has a deadline in the past and is still actionable. */
export function isOverdueTask(
  task: { dueAt?: Date | string | null; status: string },
  now = new Date(),
): boolean {
  if (!task.dueAt || !isActiveStatus(task.status)) return false;
  return new Date(task.dueAt).getTime() < startOfDay(now).getTime();
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HH:MM for <input type="time">. */
export function toTimeInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Combine a date input + optional time input into a Date. */
export function fromDateTimeInputs(date: string, time?: string): Date | undefined {
  if (!date) return undefined;
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = (time ?? "").split(":").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0);
}
