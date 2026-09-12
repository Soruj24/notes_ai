/** Recurrence value model shared by pickers, API, and expansion. */

export type Frequency = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type EndMode = "never" | "onDate" | "after";

export interface RecurrenceEnd {
  mode: EndMode;
  /** Set when mode is "onDate". */
  date?: Date;
  /** Set when mode is "after". */
  count?: number;
}

export interface RecurrenceValue {
  frequency: Frequency;
  /** Every N units (1 = plain daily/weekly/…). */
  interval: number;
  /** 0=Sun..6=Sat. Only meaningful for weekly. */
  weekdays: number[];
  end: RecurrenceEnd;
}

export const DEFAULT_RECURRENCE: RecurrenceValue = {
  frequency: "none",
  interval: 1,
  weekdays: [],
  end: { mode: "never" },
};

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function frequencyToValue(frequency: string): RecurrenceValue {
  const valid: Frequency[] = ["none", "daily", "weekly", "monthly", "yearly"];
  const f = (valid.includes(frequency as Frequency) ? frequency : "none") as Frequency;
  return { frequency: f, interval: 1, weekdays: [], end: { mode: "never" } };
}

/** Model fields (event) → picker value. */
export function recurrenceFromModel(input: {
  recurrence?: string;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[] | null;
  recurrenceUntil?: Date | string | null;
}): RecurrenceValue {
  const base = frequencyToValue(input.recurrence ?? "none");
  const interval =
    typeof input.recurrenceInterval === "number" && input.recurrenceInterval >= 1
      ? Math.min(99, Math.floor(input.recurrenceInterval))
      : 1;
  const weekdays = Array.isArray(input.recurrenceWeekdays)
    ? input.recurrenceWeekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  const withShape = { ...base, interval, weekdays };
  if (input.recurrenceUntil) {
    return {
      ...withShape,
      end: { mode: "onDate", date: new Date(input.recurrenceUntil) },
    };
  }
  return withShape;
}

/**
 * Picker value → model fields. "After N occurrences" resolves to a concrete
 * until-date by stepping from the series start (expansion caps anyway).
 */
export function recurrenceToModel(
  value: RecurrenceValue,
  seriesStart?: Date,
): {
  recurrence: Frequency;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: Date;
} {
  if (value.frequency === "none") return { recurrence: "none" };
  const out: {
    recurrence: Frequency;
    recurrenceInterval?: number;
    recurrenceWeekdays?: number[];
    recurrenceUntil?: Date;
  } = { recurrence: value.frequency };
  if (value.interval > 1) out.recurrenceInterval = Math.min(99, Math.floor(value.interval));
  if (value.frequency === "weekly" && value.weekdays.length) {
    out.recurrenceWeekdays = [...value.weekdays].sort((a, b) => a - b);
  }
  if (value.end.mode === "onDate" && value.end.date) {
    out.recurrenceUntil = new Date(value.end.date);
  } else if (value.end.mode === "after" && value.end.count && seriesStart) {
    out.recurrenceUntil = advanceNTimes(seriesStart, value, value.end.count);
  }
  return out;
}

function stepOnce(date: Date, value: RecurrenceValue): Date {
  const d = new Date(date);
  const n = Math.max(1, value.interval);
  if (value.frequency === "daily") d.setDate(d.getDate() + n);
  else if (value.frequency === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (value.frequency === "monthly") d.setMonth(d.getMonth() + n);
  else if (value.frequency === "yearly") d.setFullYear(d.getFullYear() + n);
  return d;
}

export function advanceNTimes(start: Date, value: RecurrenceValue, count: number): Date {
  let d = new Date(start);
  for (let i = 0; i < Math.max(0, Math.min(count, 365)); i++) {
    d = stepOnce(d, value);
  }
  return d;
}
