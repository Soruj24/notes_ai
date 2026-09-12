import type { ProjectStatus } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Project } from "@/src/models/project.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  dueAt?: Date;
  goalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): ProjectRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    name: doc.name as string,
    description: doc.description as string | undefined,
    status: doc.status as ProjectStatus,
    color: doc.color as string | undefined,
    dueAt: doc.dueAt as Date | undefined,
    goalId: doc.goalId ? String(doc.goalId) : undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listProjects(
  userId: string,
  workspaceId: string,
  filters: { status?: ProjectStatus; goalId?: string; limit?: number } = {},
): Promise<ProjectRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (filters.status) query.status = filters.status;
  if (filters.goalId) query.goalId = oid(filters.goalId, "goalId");
  const docs = await Project.find(query)
    .sort({ updatedAt: -1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function getProject(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<ProjectRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const doc = await Project.findOne({
    _id: oid(projectId, "projectId"),
    workspaceId: member.workspaceId,
  }).lean();
  if (!doc) throw new NotFoundError("Project not found.");
  return toRecord(doc as Record<string, unknown>);
}

export async function createProject(input: {
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  dueAt?: Date;
  goalId?: string;
}): Promise<ProjectRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Project.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    name: input.name,
    description: input.description,
    color: input.color,
    dueAt: input.dueAt,
    goalId: input.goalId ? oid(input.goalId, "goalId") : undefined,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateProject(input: {
  userId: string;
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  dueAt?: Date | null;
  goalId?: string | null;
}): Promise<ProjectRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Project.findOne({
    _id: oid(input.projectId, "projectId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Project not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.name !== undefined) doc.name = input.name;
  if (input.description !== undefined) doc.description = input.description;
  if (input.status !== undefined) doc.status = input.status;
  if (input.color !== undefined) doc.color = input.color;
  if (input.dueAt !== undefined) doc.dueAt = input.dueAt ?? undefined;
  if (input.goalId !== undefined)
    doc.goalId = input.goalId ? oid(input.goalId, "goalId") : undefined;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteProject(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Project.findOne({
    _id: oid(projectId, "projectId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Project not found.");
  assertCanWrite(member, doc.ownerId);
  await doc.deleteOne();
}
