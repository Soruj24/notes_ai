import type { Priority, Recurrence, TaskStatus } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { endOfDay, startOfDay } from "@/src/lib/dates";
import { Task } from "@/src/models/task.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export type TaskView = "all" | "today" | "upcoming" | "completed" | "overdue";

export interface SubtaskRecord {
  id: string;
  title: string;
  done: boolean;
  completedAt?: Date;
}

export interface TaskRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  startAt?: Date;
  dueAt?: Date;
  durationMin?: number;
  completedAt?: Date;
  projectId?: string;
  goalId?: string;
  tags: string[];
  subtasks: SubtaskRecord[];
  recurrence: Recurrence;
  recurrenceUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilters {
  view?: TaskView;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string;
  goalId?: string;
  tagId?: string;
  query?: string;
  limit?: number;
}

export interface TaskCounts {
  all: number;
  today: number;
  upcoming: number;
  completed: number;
  overdue: number;
}

const ACTIVE = ["todo", "in_progress"];

function toSubtask(s: Record<string, unknown>): SubtaskRecord {
  return {
    id: String(s.id ?? s._id),
    title: s.title as string,
    done: Boolean(s.done),
    completedAt: s.completedAt as Date | undefined,
  };
}

function toRecord(doc: Record<string, unknown>): TaskRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    title: doc.title as string,
    notes: doc.notes as string | undefined,
    status: doc.status as TaskStatus,
    priority: doc.priority as Priority,
    startAt: doc.startAt as Date | undefined,
    dueAt: doc.dueAt as Date | undefined,
    durationMin: doc.durationMin as number | undefined,
    completedAt: doc.completedAt as Date | undefined,
    projectId: doc.projectId ? String(doc.projectId) : undefined,
    goalId: doc.goalId ? String(doc.goalId) : undefined,
    tags: ((doc.tags ?? []) as unknown[]).map(String),
    subtasks: ((doc.subtasks ?? []) as Array<Record<string, unknown>>).map(toSubtask),
    recurrence: (doc.recurrence ?? "none") as Recurrence,
    recurrenceUntil: doc.recurrenceUntil as Date | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

function viewMatcher(view: TaskView, now: Date): Record<string, unknown> {
  switch (view) {
    case "today":
      return { status: { $in: ACTIVE }, dueAt: { $lt: endOfDay(now) } };
    case "upcoming":
      return { status: { $in: ACTIVE }, dueAt: { $gte: endOfDay(now) } };
    case "completed":
      return { status: "done" };
    case "overdue":
      return { status: { $in: ACTIVE }, dueAt: { $lt: startOfDay(now) } };
    default:
      return { status: { $ne: "archived" } };
  }
}

export async function listTasks(
  userId: string,
  workspaceId: string,
  filters: TaskFilters = {},
  now = new Date(),
): Promise<TaskRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = {
    workspaceId: member.workspaceId,
    ...viewMatcher(filters.view ?? "all", now),
  };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.projectId) query.projectId = oid(filters.projectId, "projectId");
  if (filters.goalId) query.goalId = oid(filters.goalId, "goalId");
  if (filters.tagId) query.tags = oid(filters.tagId, "tagId");
  if (filters.query) query.title = { $regex: filters.query, $options: "i" };
  const docs = await Task.find(query)
    .sort({ dueAt: 1, updatedAt: -1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/**
 * Optimized for dependency graph at scale (100/500/1000+ tasks).
 * Projects only needed fields, avoids notes/subtasks/tags payload.
 * Limit capped to 1000 to keep graph usable; pagination for lists handles the rest.
 */
export async function listTasksForGraph(
  userId: string,
  workspaceId: string,
  filter: { projectId?: string } = {},
): Promise<Array<{ id: string; title: string; status: TaskStatus; projectId?: string; priority: Priority; durationMin?: number }>> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (filter.projectId) query.projectId = oid(filter.projectId, "projectId");
  const docs = await Task.find(query)
    .select({ title: 1, status: 1, projectId: 1, priority: 1, durationMin: 1, workspaceId: 1 })
    .sort({ updatedAt: -1 })
    .limit(1000)
    .lean();
  return docs.map((d) => ({
    id: String((d as Record<string, unknown>).id ?? (d as Record<string, unknown>)._id),
    title: (d as Record<string, unknown>).title as string,
    status: (d as Record<string, unknown>).status as TaskStatus,
    projectId: (d as Record<string, unknown>).projectId ? String((d as Record<string, unknown>).projectId) : undefined,
    priority: (d as Record<string, unknown>).priority as Priority,
    durationMin: (d as Record<string, unknown>).durationMin as number | undefined,
  }));
}

export async function countTasks(
  userId: string,
  workspaceId: string,
  now = new Date(),
): Promise<TaskCounts> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const base = { workspaceId: member.workspaceId };
  const [all, today, upcoming, completed, overdue] = await Promise.all([
    Task.countDocuments({ ...base, ...viewMatcher("all", now) }),
    Task.countDocuments({ ...base, ...viewMatcher("today", now) }),
    Task.countDocuments({ ...base, ...viewMatcher("upcoming", now) }),
    Task.countDocuments({ ...base, ...viewMatcher("completed", now) }),
    Task.countDocuments({ ...base, ...viewMatcher("overdue", now) }),
  ]);
  return { all, today, upcoming, completed, overdue };
}

export async function getTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<TaskRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const doc = await Task.findOne({
    _id: oid(taskId, "taskId"),
    workspaceId: member.workspaceId,
  }).lean();
  if (!doc) throw new NotFoundError("Task not found.");
  return toRecord(doc as Record<string, unknown>);
}

export async function createTask(input: {
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
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Task.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    title: input.title,
    notes: input.notes,
    priority: input.priority ?? "medium",
    startAt: input.startAt,
    dueAt: input.dueAt,
    durationMin: input.durationMin,
    projectId: input.projectId ? oid(input.projectId, "projectId") : undefined,
    goalId: input.goalId ? oid(input.goalId, "goalId") : undefined,
    tags: (input.tagIds ?? []).map((t) => oid(t, "tagId")),
    recurrence: input.recurrence ?? "none",
    recurrenceUntil: input.recurrenceUntil,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateTask(input: {
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
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Task.findOne({
    _id: oid(input.taskId, "taskId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Task not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.title !== undefined) doc.title = input.title;
  if (input.notes !== undefined) doc.notes = input.notes;
  if (input.status !== undefined) {
    doc.status = input.status;
    doc.completedAt = input.status === "done" ? new Date() : undefined;
  }
  if (input.priority !== undefined) doc.priority = input.priority;
  if (input.startAt !== undefined) doc.startAt = input.startAt ?? undefined;
  if (input.dueAt !== undefined) doc.dueAt = input.dueAt ?? undefined;
  if (input.durationMin !== undefined) doc.durationMin = input.durationMin ?? undefined;
  if (input.projectId !== undefined)
    doc.projectId = input.projectId ? oid(input.projectId, "projectId") : undefined;
  if (input.goalId !== undefined)
    doc.goalId = input.goalId ? oid(input.goalId, "goalId") : undefined;
  if (input.tagIds !== undefined)
    doc.tags = input.tagIds.map((t) => oid(t, "tagId"));
  if (input.recurrence !== undefined) doc.recurrence = input.recurrence;
  if (input.recurrenceUntil !== undefined)
    doc.recurrenceUntil = input.recurrenceUntil ?? undefined;
  if (input.ownerId !== undefined) {
    if (input.ownerId === null || input.ownerId === "") {
      // No-op: keep current owner
    } else {
      // Verify assignee is member of workspace
      const assigneeId = oid(input.ownerId, "ownerId");
      const { WorkspaceMember } = await import("@/src/models/workspace-member.model");
      const isMember = await WorkspaceMember.findOne({ workspaceId: member.workspaceId, userId: assigneeId }).lean();
      if (!isMember) throw new NotFoundError("Assignee is not a workspace member.");
      doc.ownerId = assigneeId;
    }
  }
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Task.findOne({
    _id: oid(taskId, "taskId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Task not found.");
  assertCanWrite(member, doc.ownerId);
  await doc.deleteOne();
}

async function loadWritableTask(userId: string, workspaceId: string, taskId: string) {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Task.findOne({
    _id: oid(taskId, "taskId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Task not found.");
  assertCanWrite(member, doc.ownerId);
  return doc;
}

export async function addSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  title: string,
): Promise<TaskRecord> {
  const doc = await loadWritableTask(userId, workspaceId, taskId);
  doc.subtasks.push({ title } as never);
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  subtaskId: string,
  input: { title?: string; done?: boolean },
): Promise<TaskRecord> {
  const doc = await loadWritableTask(userId, workspaceId, taskId);
  let sub = undefined as (typeof doc.subtasks)[number] | undefined;
  for (const s of doc.subtasks) {
    if (String(s._id) === subtaskId) {
      sub = s;
      break;
    }
  }
  if (!sub) throw new NotFoundError("Subtask not found.");
  if (input.title !== undefined) sub.title = input.title;
  if (input.done !== undefined) {
    sub.done = input.done;
    sub.completedAt = input.done ? new Date() : undefined;
  }
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function removeSubtask(
  userId: string,
  workspaceId: string,
  taskId: string,
  subtaskId: string,
): Promise<TaskRecord> {
  const doc = await loadWritableTask(userId, workspaceId, taskId);
  let index = -1;
  for (let i = 0; i < doc.subtasks.length; i++) {
    if (String(doc.subtasks[i]._id) === subtaskId) {
      index = i;
      break;
    }
  }
  if (index === -1) throw new NotFoundError("Subtask not found.");
  doc.subtasks.splice(index, 1);
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}
