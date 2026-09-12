import type { Priority, Recurrence, TaskStatus } from "@/src/lib/db/enums";
import { advanceRecurrence } from "@/src/lib/dates";
import {
  addSubtask,
  countTasks,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  removeSubtask,
  updateSubtask,
  updateTask,
  type TaskCounts,
  type TaskFilters,
  type TaskRecord,
} from "@/src/repositories/task.repository";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Task use-cases: repository delegation, recurrence spawn, activity. */
export async function listUserTasks(
  userId: string,
  workspaceId: string,
  filters?: TaskFilters,
  now?: Date,
): Promise<TaskRecord[]> {
  await requireFlag("tasks", userId);
  return listTasks(userId, workspaceId, filters, now);
}

export async function countUserTasks(
  userId: string,
  workspaceId: string,
  now?: Date,
): Promise<TaskCounts> {
  await requireFlag("tasks", userId);
  return countTasks(userId, workspaceId, now);
}

export async function getUserTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<TaskRecord> {
  await requireFlag("tasks", userId);
  return getTask(userId, workspaceId, taskId);
}

export async function createUserTask(input: {
  userId: string;
  workspaceId: string;
  title: string;
  notes?: string;
  priority?: Priority;
  startAt?: Date;
  dueAt?: Date;
  durationMin?: number;
  projectId?: string;
  goalId?: string;
  tagIds?: string[];
  recurrence?: Recurrence;
  recurrenceUntil?: Date;
}): Promise<TaskRecord> {
  await requireFlag("tasks", input.userId);
  const task = await createTask(input);
  publishDomainEvent("task.created", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: task.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "task",
    entityId: task.id,
  });
  return task;
}

export async function updateUserTask(input: {
  userId: string;
  workspaceId: string;
  taskId: string;
  title?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: Priority;
  startAt?: Date | null;
  dueAt?: Date | null;
  durationMin?: number | null;
  projectId?: string | null;
  goalId?: string | null;
  tagIds?: string[];
  recurrence?: Recurrence;
  recurrenceUntil?: Date | null;
  ownerId?: string | null;
}): Promise<TaskRecord> {
  await requireFlag("tasks", input.userId);
  const task = await updateTask(input);
  publishDomainEvent(task.status === "done" ? "task.completed" : "task.updated", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: task.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: task.status === "done" ? "completed" : "updated",
    entityType: "task",
    entityId: task.id,
  });
  return task;
}

export interface CompleteResult {
  task: TaskRecord;
  next?: TaskRecord;
}

/**
 * Complete a task. Recurring tasks spawn their next instance
 * (until recurrenceUntil); the spawn carries schedule + links forward.
 */
export async function completeUserTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<CompleteResult> {
  await requireFlag("tasks", userId);
  const task = await updateTask({
    userId,
    workspaceId,
    taskId,
    status: "done",
  });
  publishDomainEvent("task.completed", {
    workspaceId,
    actorId: userId,
    entityId: task.id,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "completed",
    entityType: "task",
    entityId: task.id,
  });

  let next: TaskRecord | undefined;
  if (task.recurrence !== "none") {
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    const nextDue = advanceRecurrence(base, task.recurrence);
    const until = task.recurrenceUntil ? new Date(task.recurrenceUntil) : undefined;
    if (nextDue && (!until || nextDue.getTime() <= until.getTime())) {
      const shiftMs = nextDue.getTime() - base.getTime();
      next = await createTask({
        userId,
        workspaceId,
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        startAt: task.startAt
          ? new Date(new Date(task.startAt).getTime() + shiftMs)
          : undefined,
        dueAt: nextDue,
        durationMin: task.durationMin,
        projectId: task.projectId,
        goalId: task.goalId,
        tagIds: task.tags,
        recurrence: task.recurrence,
        recurrenceUntil: task.recurrenceUntil,
      });
      await logActivity({
        workspaceId,
        actorId: userId,
        action: "created",
        entityType: "task",
        entityId: next.id,
        metadata: { recurrenceFrom: task.id },
      });
    }
  }
  return { task, next };
}

export async function reopenUserTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<TaskRecord> {
  await requireFlag("tasks", userId);
  const task = await updateTask({ userId, workspaceId, taskId, status: "todo" });
  publishDomainEvent("task.updated", {
    workspaceId,
    actorId: userId,
    entityId: task.id,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "reopened",
    entityType: "task",
    entityId: task.id,
  });
  return task;
}

export async function deleteUserTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  await requireFlag("tasks", userId);
  await deleteTask(userId, workspaceId, taskId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "tasks", taskId);
  publishDomainEvent("task.deleted", {
    workspaceId,
    actorId: userId,
    entityId: taskId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "task",
    entityId: taskId,
  });
}

export async function addUserSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  title: string,
): Promise<TaskRecord> {
  await requireFlag("tasks", userId);
  const task = await addSubtask(userId, workspaceId, taskId, title);
  publishDomainEvent("task.updated", {
    workspaceId,
    actorId: userId,
    entityId: taskId,
  });
  return task;
}

export async function updateUserSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  subtaskId: string,
  input: { title?: string; done?: boolean },
): Promise<TaskRecord> {
  await requireFlag("tasks", userId);
  const task = await updateSubtask(userId, workspaceId, taskId, subtaskId, input);
  publishDomainEvent("task.updated", {
    workspaceId,
    actorId: userId,
    entityId: taskId,
  });
  return task;
}

export async function removeUserSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  subtaskId: string,
): Promise<TaskRecord> {
  await requireFlag("tasks", userId);
  const task = await removeSubtask(userId, workspaceId, taskId, subtaskId);
  publishDomainEvent("task.updated", {
    workspaceId,
    actorId: userId,
    entityId: taskId,
  });
  return task;
}
