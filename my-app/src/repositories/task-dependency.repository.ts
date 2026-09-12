import type { TaskDependencyType } from "@/src/lib/db/enums";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/src/lib/db/errors";
import { Task } from "@/src/models/task.model";
import { TaskDependency } from "@/src/models/task-dependency.model";
import {
  assertCanWrite,
  db,
  oid,
  requireMembership,
  requireWritableMembership,
} from "@/src/repositories/base";

export interface TaskDependencyRecord {
  id: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): TaskDependencyRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    predecessorTaskId: String(doc.predecessorTaskId),
    successorTaskId: String(doc.successorTaskId),
    type: doc.type as TaskDependencyType,
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

// ---------------------------------------------------------------------------
// Helpers — workspace isolation + task ownership
// ---------------------------------------------------------------------------

async function assertTasksInWorkspace(
  workspaceIdStr: string,
  predecessorTaskId: string,
  successorTaskId: string,
): Promise<void> {
  const [pre, succ] = await Promise.all([
    Task.findOne({
      _id: oid(predecessorTaskId, "predecessorTaskId"),
      workspaceId: oid(workspaceIdStr, "workspaceId"),
    })
      .select({ _id: 1, workspaceId: 1, ownerId: 1 })
      .lean(),
    Task.findOne({
      _id: oid(successorTaskId, "successorTaskId"),
      workspaceId: oid(workspaceIdStr, "workspaceId"),
    })
      .select({ _id: 1, workspaceId: 1, ownerId: 1 })
      .lean(),
  ]);

  if (!pre) throw new NotFoundError("Predecessor task not found in this workspace.");
  if (!succ) throw new NotFoundError("Successor task not found in this workspace.");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTaskDependency(input: {
  userId: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
}): Promise<TaskDependencyRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify dependencies.");
  }
  await db();

  // Prevent Task A → Task A
  if (String(input.predecessorTaskId) === String(input.successorTaskId)) {
    throw new ValidationError({ successorTaskId: ["Task cannot depend on itself."] });
  }

  // Workspace isolation — both tasks must belong to member.workspaceId
  await assertTasksInWorkspace(
    String(member.workspaceId),
    input.predecessorTaskId,
    input.successorTaskId,
  );

  // Duplicate edge prevention — same (workspace, predecessor, successor) at most once.
  // Unique index {workspaceId, predecessorTaskId, successorTaskId} also enforces this
  // at the DB level; the explicit check gives a friendly 409/400 instead of 11000.
  const existing = await TaskDependency.findOne({
    workspaceId: member.workspaceId,
    predecessorTaskId: oid(input.predecessorTaskId, "predecessorTaskId"),
    successorTaskId: oid(input.successorTaskId, "successorTaskId"),
  }).lean();

  if (existing) {
    throw new ConflictError("Dependency already exists.");
  }

  // Also prevent inverse duplicate from creating logical duplicates
  // If your product treats A blocks B and B blocked_by A as the same edge,
  // uncomment the check below to forbid either direction:
  // const inverse = await TaskDependency.findOne({
  //   workspaceId: member.workspaceId,
  //   predecessorTaskId: oid(input.successorTaskId),
  //   successorTaskId: oid(input.predecessorTaskId),
  // }).lean();
  // if (inverse) throw new ConflictError("Inverse dependency already exists.");

  try {
    const doc = await TaskDependency.create({
      workspaceId: member.workspaceId,
      predecessorTaskId: oid(input.predecessorTaskId, "predecessorTaskId"),
      successorTaskId: oid(input.successorTaskId, "successorTaskId"),
      type: input.type,
      createdBy: member.userId,
    });
    return toRecord(doc.toObject() as Record<string, unknown>);
  } catch (err: unknown) {
    // Race condition: unique index violation → friendly 409
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      throw new ConflictError("Dependency already exists.");
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listTaskDependencies(
  userId: string,
  workspaceId: string,
  filter: { taskId?: string; type?: TaskDependencyType } = {},
): Promise<TaskDependencyRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();

  const query: Record<string, unknown> = {
    workspaceId: member.workspaceId,
  };

  if (filter.taskId) {
    const tid = oid(filter.taskId, "taskId");
    query.$or = [{ predecessorTaskId: tid }, { successorTaskId: tid }];
  }
  if (filter.type) query.type = filter.type;

  const docs = await TaskDependency.find(query)
    .select({ workspaceId: 1, predecessorTaskId: 1, successorTaskId: 1, type: 1, createdBy: 1, createdAt: 1, updatedAt: 1 })
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/**
 * Graph-optimized: lean without sort overhead, capped to 2000 edges.
 */
export async function listDependenciesForGraph(
  userId: string,
  workspaceId: string,
): Promise<TaskDependencyRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const docs = await TaskDependency.find({ workspaceId: member.workspaceId })
    .select({ predecessorTaskId: 1, successorTaskId: 1, type: 1, workspaceId: 1 })
    .lean()
    .limit(2000);
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function listDependenciesForTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<{ incoming: TaskDependencyRecord[]; outgoing: TaskDependencyRecord[] }> {
  const member = await requireMembership(userId, workspaceId);
  await db();

  const tid = oid(taskId, "taskId");
  const [incoming, outgoing] = await Promise.all([
    TaskDependency.find({ workspaceId: member.workspaceId, successorTaskId: tid })
      .sort({ createdAt: -1 })
      .lean(),
    TaskDependency.find({ workspaceId: member.workspaceId, predecessorTaskId: tid })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    incoming: incoming.map((d) => toRecord(d as Record<string, unknown>)),
    outgoing: outgoing.map((d) => toRecord(d as Record<string, unknown>)),
  };
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getTaskDependency(
  userId: string,
  workspaceId: string,
  dependencyId: string,
): Promise<TaskDependencyRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();

  const doc = await TaskDependency.findOne({
    _id: oid(dependencyId, "dependencyId"),
    workspaceId: member.workspaceId,
  }).lean();

  if (!doc) throw new NotFoundError("Dependency not found.");
  return toRecord(doc as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Delete — ownership + workspace isolation
// ---------------------------------------------------------------------------

export async function deleteTaskDependency(
  userId: string,
  workspaceId: string,
  dependencyId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();

  const doc = await TaskDependency.findOne({
    _id: oid(dependencyId, "dependencyId"),
    workspaceId: member.workspaceId,
  });

  if (!doc) throw new NotFoundError("Dependency not found.");

  // Ownership validation — ELEVATED_ROLES (owner/admin) may remove any edge;
  // members may only remove edges they created (mirrors assertCanWrite).
  assertCanWrite(member, doc.createdBy);

  await doc.deleteOne();
}

// ---------------------------------------------------------------------------
// Cascade helper — called by task deletion to avoid orphans
// ---------------------------------------------------------------------------

export async function deleteDependenciesForTask(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  await db();
  const tid = oid(taskId, "taskId");
  const ws = oid(workspaceId, "workspaceId");
  await TaskDependency.deleteMany({
    workspaceId: ws,
    $or: [{ predecessorTaskId: tid }, { successorTaskId: tid }],
  });
}
