import type { GoalFrequency, GoalStatus } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Goal } from "@/src/models/goal.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface MilestoneRecord {
  id: string;
  title: string;
  done: boolean;
  completedAt?: Date;
  targetDate?: Date;
}

export interface GoalRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  frequency: GoalFrequency;
  targetDate?: Date;
  progress: number;
  milestones: MilestoneRecord[];
  createdAt: Date;
  updatedAt: Date;
}

function toMilestone(m: Record<string, unknown>): MilestoneRecord {
  return {
    id: String(m.id ?? m._id),
    title: m.title as string,
    done: Boolean(m.done),
    completedAt: m.completedAt as Date | undefined,
    targetDate: m.targetDate as Date | undefined,
  };
}

function toRecord(doc: Record<string, unknown>): GoalRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    title: doc.title as string,
    description: doc.description as string | undefined,
    status: doc.status as GoalStatus,
    frequency: (doc.frequency ?? "monthly") as GoalFrequency,
    targetDate: doc.targetDate as Date | undefined,
    progress: Number(doc.progress ?? 0),
    milestones: ((doc.milestones ?? []) as Array<Record<string, unknown>>).map(toMilestone),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listGoals(
  userId: string,
  workspaceId: string,
  filters: { status?: GoalStatus; limit?: number } = {},
): Promise<GoalRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (filters.status) query.status = filters.status;
  const docs = await Goal.find(query)
    .sort({ targetDate: 1, updatedAt: -1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function getGoal(
  userId: string,
  workspaceId: string,
  goalId: string,
): Promise<GoalRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const doc = await Goal.findOne({
    _id: oid(goalId, "goalId"),
    workspaceId: member.workspaceId,
  }).lean();
  if (!doc) throw new NotFoundError("Goal not found.");
  return toRecord(doc as Record<string, unknown>);
}

export async function createGoal(input: {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  frequency?: GoalFrequency;
  targetDate?: Date;
}): Promise<GoalRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Goal.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    title: input.title,
    description: input.description,
    frequency: input.frequency ?? "monthly",
    targetDate: input.targetDate,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateGoal(input: {
  userId: string;
  workspaceId: string;
  goalId: string;
  title?: string;
  description?: string;
  status?: GoalStatus;
  frequency?: GoalFrequency;
  targetDate?: Date | null;
  progress?: number;
}): Promise<GoalRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Goal.findOne({
    _id: oid(input.goalId, "goalId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Goal not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;
  if (input.status !== undefined) doc.status = input.status;
  if (input.frequency !== undefined) doc.frequency = input.frequency;
  if (input.targetDate !== undefined) doc.targetDate = input.targetDate ?? undefined;
  if (input.progress !== undefined)
    doc.progress = Math.min(100, Math.max(0, input.progress));
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

async function loadWritableGoal(userId: string, workspaceId: string, goalId: string) {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Goal.findOne({
    _id: oid(goalId, "goalId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Goal not found.");
  assertCanWrite(member, doc.ownerId);
  return doc;
}

export async function addMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  input: { title: string; targetDate?: Date },
): Promise<GoalRecord> {
  const doc = await loadWritableGoal(userId, workspaceId, goalId);
  doc.milestones.push({ title: input.title, targetDate: input.targetDate } as never);
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  milestoneId: string,
  input: { title?: string; done?: boolean; targetDate?: Date | null },
): Promise<GoalRecord> {
  const doc = await loadWritableGoal(userId, workspaceId, goalId);
  let found = undefined as (typeof doc.milestones)[number] | undefined;
  for (const m of doc.milestones) {
    if (String(m._id) === milestoneId) {
      found = m;
      break;
    }
  }
  if (!found) throw new NotFoundError("Milestone not found.");
  if (input.title !== undefined) found.title = input.title;
  if (input.done !== undefined) {
    found.done = input.done;
    found.completedAt = input.done ? new Date() : undefined;
  }
  if (input.targetDate !== undefined) found.targetDate = input.targetDate ?? undefined;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function removeMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  milestoneId: string,
): Promise<GoalRecord> {
  const doc = await loadWritableGoal(userId, workspaceId, goalId);
  let index = -1;
  for (let i = 0; i < doc.milestones.length; i++) {
    if (String(doc.milestones[i]._id) === milestoneId) {
      index = i;
      break;
    }
  }
  if (index === -1) throw new NotFoundError("Milestone not found.");
  doc.milestones.splice(index, 1);
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteGoal(
  userId: string,
  workspaceId: string,
  goalId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Goal.findOne({
    _id: oid(goalId, "goalId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Goal not found.");
  assertCanWrite(member, doc.ownerId);
  await doc.deleteOne();
}
