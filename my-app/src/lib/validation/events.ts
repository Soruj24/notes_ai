import { EVENT_STATUSES, RECURRENCES } from "@/src/lib/db/enums";
import type { FieldErrors, ValidationResult } from "@/src/lib/auth/validation";

/** Event validation schemas. Dates arrive as ISO strings. */

function fail<T>(errors: FieldErrors): ValidationResult<T> {
  return { ok: false, errors };
}

function pass<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

function asDate(v: unknown): Date | undefined | "invalid" {
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

export interface EventCreateData {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  recurrence: (typeof RECURRENCES)[number];
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceUntil?: Date;
  location?: string;
  projectId?: string;
  status: (typeof EVENT_STATUSES)[number];
  /** Optional: create a linked reminder N minutes before start. */
  reminderMinutesBefore?: number;
}

function asInterval(v: unknown): number | undefined | "invalid" {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 99) return "invalid";
  return n;
}

function asWeekdays(v: unknown): number[] | undefined | "invalid" {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return "invalid";
  const days = v.map(Number);
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "invalid";
  return [...new Set(days)].sort((a, b) => a - b);
}

export function validateEventCreate(
  input: Record<string, unknown>,
): ValidationResult<EventCreateData> {
  const errors: FieldErrors = {};
  const title =
    typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 200)
    errors.title = ["Title is required (max 200 characters)."];

  const startsAt = asDate(input.startsAt);
  if (!(startsAt instanceof Date)) errors.startsAt = ["Invalid start date."];
  const endsAt = asDate(input.endsAt);
  if (!(endsAt instanceof Date)) errors.endsAt = ["Invalid end date."];
  if (
    startsAt instanceof Date &&
    endsAt instanceof Date &&
    endsAt.getTime() < startsAt.getTime()
  ) {
    errors.endsAt = ["Event end must not precede its start."];
  }

  const recurrence =
    typeof input.recurrence === "string" &&
    (RECURRENCES as readonly string[]).includes(input.recurrence)
      ? (input.recurrence as EventCreateData["recurrence"])
      : input.recurrence === undefined
        ? "none"
        : "invalid";
  if (recurrence === "invalid") errors.recurrence = ["Invalid recurrence."];
  const recurrenceInterval = asInterval(input.recurrenceInterval ?? 1);
  if (recurrenceInterval === "invalid") {
    errors.recurrenceInterval = ["Interval must be an integer 1–99."];
  }
  const recurrenceWeekdays = asWeekdays(input.recurrenceWeekdays ?? []);
  if (recurrenceWeekdays === "invalid") {
    errors.recurrenceWeekdays = ["Weekdays must be 0 (Sun) – 6 (Sat)."];
  }
  const recurrenceUntil = asDate(input.recurrenceUntil);
  if (recurrenceUntil === "invalid") {
    errors.recurrenceUntil = ["Invalid recurrence end date."];
  }

  const status =
    typeof input.status === "string" &&
    (EVENT_STATUSES as readonly string[]).includes(input.status)
      ? (input.status as EventCreateData["status"])
      : input.status === undefined
        ? "confirmed"
        : "invalid";
  if (status === "invalid") errors.status = ["Invalid status."];

  let reminderMinutesBefore: number | undefined;
  if (input.reminderMinutesBefore !== undefined && input.reminderMinutesBefore !== null && input.reminderMinutesBefore !== "") {
    const n = Number(input.reminderMinutesBefore);
    if (!Number.isFinite(n) || n < 0 || n > 10080) {
      errors.reminderMinutesBefore = ["Reminder offset must be 0–10080 minutes."];
    } else {
      reminderMinutesBefore = Math.floor(n);
    }
  }

  if (Object.keys(errors).length) return fail(errors);
  return pass({
    title,
    description:
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim().slice(0, 10000)
        : undefined,
    startsAt: startsAt as Date,
    endsAt: endsAt as Date,
    allDay: input.allDay === true,
    recurrenceInterval: (recurrenceInterval === "invalid" ? 1 : recurrenceInterval) ?? 1,
    recurrenceWeekdays: (recurrenceWeekdays === "invalid" ? [] : recurrenceWeekdays) ?? [],
    recurrence: (recurrence === "invalid" ? "none" : recurrence) as EventCreateData["recurrence"],
    recurrenceUntil: recurrenceUntil instanceof Date ? recurrenceUntil : undefined,
    location:
      typeof input.location === "string" && input.location.trim()
        ? input.location.trim().slice(0, 300)
        : undefined,
    projectId:
      typeof input.projectId === "string" && input.projectId ? input.projectId : undefined,
    status: (status === "invalid" ? "confirmed" : status) as EventCreateData["status"],
    reminderMinutesBefore,
  });
}

export type EventUpdateData = Partial<
  Omit<EventCreateData, "reminderMinutesBefore" | "startsAt" | "endsAt" | "recurrenceUntil">
> & {
  startsAt?: Date;
  endsAt?: Date;
  recurrenceUntil?: Date;
};

export function validateEventUpdate(
  input: Record<string, unknown>,
): ValidationResult<EventUpdateData> {
  const errors: FieldErrors = {};
  const data: EventUpdateData & Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title || title.length > 200) errors.title = ["Title must not be empty (max 200)."];
    else data.title = title;
  }
  if (input.description !== undefined) {
    data.description =
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim().slice(0, 10000)
        : undefined;
  }
  for (const key of ["startsAt", "endsAt", "recurrenceUntil"] as const) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== "") {
      const d = asDate(input[key]);
      if (!(d instanceof Date)) errors[key] = [`Invalid ${key}.`];
      else data[key] = d;
    }
  }
  if (input.allDay !== undefined) {
    if (typeof input.allDay !== "boolean") errors.allDay = ["allDay must be a boolean."];
    else data.allDay = input.allDay;
  }
  if (input.recurrence !== undefined) {
    if (
      typeof input.recurrence !== "string" ||
      !(RECURRENCES as readonly string[]).includes(input.recurrence)
    ) {
      errors.recurrence = ["Invalid recurrence."];
    } else {
      data.recurrence = input.recurrence as EventCreateData["recurrence"];
    }
  }
  if (input.recurrenceInterval !== undefined) {
    const interval = asInterval(input.recurrenceInterval);
    if (interval === "invalid" || interval === undefined) {
      errors.recurrenceInterval = ["Interval must be an integer 1–99."];
    } else {
      (data as Record<string, unknown>).recurrenceInterval = interval;
    }
  }
  if (input.recurrenceWeekdays !== undefined) {
    const weekdays = asWeekdays(input.recurrenceWeekdays);
    if (weekdays === "invalid" || weekdays === undefined) {
      errors.recurrenceWeekdays = ["Weekdays must be 0 (Sun) – 6 (Sat)."];
    } else {
      (data as Record<string, unknown>).recurrenceWeekdays = weekdays;
    }
  }
  if (input.status !== undefined) {
    if (
      typeof input.status !== "string" ||
      !(EVENT_STATUSES as readonly string[]).includes(input.status)
    ) {
      errors.status = ["Invalid status."];
    } else {
      data.status = input.status as EventCreateData["status"];
    }
  }
  if (input.location !== undefined) {
    data.location =
      typeof input.location === "string" && input.location.trim()
        ? input.location.trim().slice(0, 300)
        : undefined;
  }
  if (input.projectId !== undefined) {
    data.projectId =
      input.projectId === null || input.projectId === ""
        ? undefined
        : typeof input.projectId === "string"
          ? input.projectId
          : undefined;
    if (input.projectId !== null && input.projectId !== "" && typeof input.projectId !== "string") {
      errors.projectId = ["Invalid projectId."];
    }
  }

  if (Object.keys(errors).length) return fail(errors);
  return pass(data);
}
