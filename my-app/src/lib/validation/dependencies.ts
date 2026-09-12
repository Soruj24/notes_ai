import { TASK_DEPENDENCY_TYPES, type TaskDependencyType } from "@/src/lib/db/enums";
import type { FieldErrors, ValidationResult } from "@/src/lib/auth/validation";
import { z } from "zod";

/**
 * Dependency validation — pure, framework-free.
 * Mirrors src/lib/validation/tasks.ts pattern (fail/pass, FieldErrors).
 * No DB or React code inside.
 */

function fail<T>(errors: FieldErrors): ValidationResult<T> {
  return { ok: false, errors };
}

function pass<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined | "invalid" {
  if (v === undefined || v === null) return undefined;
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : "invalid";
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface TaskDependencyCreateData {
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
}

export function validateTaskDependencyCreate(
  input: Record<string, unknown>,
): ValidationResult<TaskDependencyCreateData> {
  const errors: FieldErrors = {};

  const predecessorTaskId = asTrimmedString(input.predecessorTaskId);
  if (!predecessorTaskId) errors.predecessorTaskId = ["Predecessor task is required."];

  const successorTaskId = asTrimmedString(input.successorTaskId);
  if (!successorTaskId) errors.successorTaskId = ["Successor task is required."];

  const type = asEnum(input.type, TASK_DEPENDENCY_TYPES);
  if (type === "invalid") errors.type = ["Invalid dependency type."];
  if (type === undefined) errors.type = ["Type is required (blocks, blocked_by, related)."];

  // Prevent Task A → Task A at validation layer (repository and model also guard).
  if (
    predecessorTaskId &&
    successorTaskId &&
    predecessorTaskId === successorTaskId
  ) {
    errors.successorTaskId = ["Task cannot depend on itself."];
  }

  if (Object.keys(errors).length) return fail(errors);

  return pass({
    predecessorTaskId: predecessorTaskId as string,
    successorTaskId: successorTaskId as string,
    type: type as TaskDependencyType,
  });
}

// ---------------------------------------------------------------------------
// Query / filter validation (for list endpoints)
// ---------------------------------------------------------------------------

export interface TaskDependencyFilterData {
  taskId?: string;
  type?: TaskDependencyType;
}

export function validateTaskDependencyFilter(
  input: Record<string, unknown>,
): ValidationResult<TaskDependencyFilterData> {
  const errors: FieldErrors = {};
  const data: TaskDependencyFilterData = {};

  if (input.taskId !== undefined && input.taskId !== null && input.taskId !== "") {
    const v = asTrimmedString(input.taskId);
    if (!v) errors.taskId = ["Invalid taskId."];
    else data.taskId = v;
  }

  if (input.type !== undefined && input.type !== null && input.type !== "") {
    const t = asEnum(input.type, TASK_DEPENDENCY_TYPES);
    if (t === "invalid" || t === undefined) errors.type = ["Invalid dependency type."];
    else data.type = t as TaskDependencyType;
  }

  if (Object.keys(errors).length) return fail(errors);
  return pass(data);
}

// ---------------------------------------------------------------------------
// Zod schemas — required by API layer (Route → Validation)
// Strict, co-located with manual validators for single source of truth.
// ---------------------------------------------------------------------------

export const zTaskDependencyCreate = z
  .object({
    workspaceId: z.string().min(1, "workspaceId is required."),
    predecessorTaskId: z.string().min(1, "Predecessor task is required."),
    successorTaskId: z.string().min(1, "Successor task is required."),
    type: z.enum(TASK_DEPENDENCY_TYPES, { message: "Invalid dependency type." }),
  })
  .refine((v) => v.predecessorTaskId !== v.successorTaskId, {
    path: ["successorTaskId"],
    message: "Task cannot depend on itself.",
  });

export const zDependencyListQuery = z.object({
  workspaceId: z.string().min(1, "workspaceId is required."),
  taskId: z.string().min(1).optional(),
  type: z.enum(TASK_DEPENDENCY_TYPES).optional(),
});

export const zDependencyGraphQuery = z.object({
  workspaceId: z.string().min(1, "workspaceId is required."),
});

export const zProjectDependencyGraphParams = z.object({
  projectId: z.string().min(1, "projectId is required."),
  workspaceId: z.string().min(1, "workspaceId is required."),
});

export type ZTaskDependencyCreate = z.infer<typeof zTaskDependencyCreate>;
