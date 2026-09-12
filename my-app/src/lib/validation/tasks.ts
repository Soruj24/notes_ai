import { PRIORITIES, RECURRENCES, TASK_STATUSES } from "@/src/lib/db/enums";
import type { FieldErrors, ValidationResult } from "@/src/lib/auth/validation";

/**
 * Task validation schemas. Pure functions shared by API handlers and forms.
 * Dates arrive as ISO strings; recurrence rules enforced here.
 */

function fail<T>(errors: FieldErrors): ValidationResult<T> {
  return { ok: false, errors };
}

function pass<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

function asTrimmed(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > max ? undefined : t;
}

function asDate(v: unknown): Date | undefined | "invalid" {
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

function asEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined | "invalid" {
  if (v === undefined) return undefined;
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : "invalid";
}

export interface TaskCreateData {
  title: string;
  notes?: string;
  priority: (typeof PRIORITIES)[number];
  startAt?: Date;
  dueAt?: Date;
  durationMin?: number;
  projectId?: string;
  goalId?: string;
  tagIds?: string[];
  recurrence?: (typeof RECURRENCES)[number];
  recurrenceUntil?: Date;
}

export function validateTaskCreate(
  input: Record<string, unknown>,
): ValidationResult<TaskCreateData> {
  const errors: FieldErrors = {};
  const title = asTrimmed(input.title, 200);
  if (!title) errors.title = ["Title is required (max 200 characters)."];

  const priority = asEnum(input.priority ?? "medium", PRIORITIES);
  if (priority === "invalid") errors.priority = ["Invalid priority."];

  const startAt = asDate(input.startAt);
  if (startAt === "invalid") errors.startAt = ["Invalid start date."];
  const dueAt = asDate(input.dueAt);
  if (dueAt === "invalid") errors.dueAt = ["Invalid due date."];
  if (
    startAt instanceof Date &&
    dueAt instanceof Date &&
    dueAt.getTime() < startAt.getTime()
  ) {
    errors.dueAt = ["Due date must not precede the start date."];
  }

  let durationMin: number | undefined;
  if (input.durationMin !== undefined && input.durationMin !== null && input.durationMin !== "") {
    const n = Number(input.durationMin);
    if (!Number.isFinite(n) || n < 0 || n > 10080) {
      errors.durationMin = ["Duration must be 0–10080 minutes."];
    } else {
      durationMin = Math.floor(n);
    }
  }

  const recurrence = asEnum(input.recurrence ?? "none", RECURRENCES);
  if (recurrence === "invalid") errors.recurrence = ["Invalid recurrence."];
  const recurrenceUntil = asDate(input.recurrenceUntil);
  if (recurrenceUntil === "invalid") {
    errors.recurrenceUntil = ["Invalid recurrence end date."];
  }
  if (recurrence && recurrence !== "none" && !recurrenceUntil) {
    errors.recurrenceUntil = ["Recurring tasks need an end date."];
  }

  const notes = asTrimmed(input.notes, 50000);
  if (input.notes !== undefined && notes === undefined)
    errors.notes = ["Notes are too long."];

  if (Object.keys(errors).length) return fail(errors);
  return pass({
    title: title as string,
    notes,
    priority: (priority ?? "medium") as TaskCreateData["priority"],
    startAt: startAt instanceof Date ? startAt : undefined,
    dueAt: dueAt instanceof Date ? dueAt : undefined,
    durationMin,
    projectId: typeof input.projectId === "string" && input.projectId ? input.projectId : undefined,
    goalId: typeof input.goalId === "string" && input.goalId ? input.goalId : undefined,
    tagIds:
      Array.isArray(input.tagIds) && input.tagIds.every((x) => typeof x === "string")
        ? (input.tagIds as string[])
        : undefined,
    recurrence: (recurrence ?? "none") as TaskCreateData["recurrence"],
    recurrenceUntil: recurrenceUntil instanceof Date ? recurrenceUntil : undefined,
  });
}

export type TaskUpdateData = Partial<TaskCreateData> & {
  status?: (typeof TASK_STATUSES)[number];
};

export function validateTaskUpdate(
  input: Record<string, unknown>,
): ValidationResult<TaskUpdateData> {
  const errors: FieldErrors = {};
  const data: TaskUpdateData = {};

  if (input.title !== undefined) {
    const title = asTrimmed(input.title, 200);
    if (!title) errors.title = ["Title must not be empty (max 200)."];
    else data.title = title;
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== "string" || input.notes.length > 50000) {
      errors.notes = ["Notes are too long."];
    } else {
      data.notes = input.notes;
    }
  }
  if (input.status !== undefined) {
    const status = asEnum(input.status, TASK_STATUSES);
    if (status === "invalid" || status === undefined) errors.status = ["Invalid status."];
    else data.status = status;
  }
  if (input.priority !== undefined) {
    const priority = asEnum(input.priority, PRIORITIES);
    if (priority === "invalid" || priority === undefined) errors.priority = ["Invalid priority."];
    else data.priority = priority;
  }
  for (const key of ["startAt", "dueAt", "recurrenceUntil"] as const) {
    if (input[key] !== undefined) {
      if (input[key] === null || input[key] === "") {
        (data as Record<string, unknown>)[key] = null;
      } else {
        const d = asDate(input[key]);
        if (d === "invalid" || d === undefined) errors[key] = [`Invalid ${key}.`];
        else (data as Record<string, unknown>)[key] = d;
      }
    }
  }
  if (input.durationMin !== undefined) {
    if (input.durationMin === null || input.durationMin === "") {
      data.durationMin = undefined;
    } else {
      const n = Number(input.durationMin);
      if (!Number.isFinite(n) || n < 0 || n > 10080) {
        errors.durationMin = ["Duration must be 0–10080 minutes."];
      } else {
        data.durationMin = Math.floor(n);
      }
    }
  }
  if (input.recurrence !== undefined) {
    const recurrence = asEnum(input.recurrence, RECURRENCES);
    if (recurrence === "invalid" || recurrence === undefined) {
      errors.recurrence = ["Invalid recurrence."];
    } else {
      data.recurrence = recurrence;
    }
  }
  for (const key of ["projectId", "goalId"] as const) {
    if (input[key] !== undefined) {
      data[key] =
        input[key] === null || input[key] === ""
          ? undefined
          : typeof input[key] === "string"
            ? (input[key] as string)
            : undefined;
      if (input[key] !== null && input[key] !== "" && typeof input[key] !== "string") {
        errors[key] = [`Invalid ${key}.`];
      }
    }
  }
  if (input.tagIds !== undefined) {
    if (!Array.isArray(input.tagIds) || !input.tagIds.every((x) => typeof x === "string")) {
      errors.tagIds = ["tagIds must be an array of strings."];
    } else {
      data.tagIds = input.tagIds as string[];
    }
  }

  if (Object.keys(errors).length) return fail(errors);
  return pass(data);
}

export function validateSubtask(
  input: Record<string, unknown>,
): ValidationResult<{ title: string }> {
  const title = asTrimmed(input.title, 200);
  if (!title) return fail({ title: ["Title is required (max 200)."] });
  return pass({ title });
}
