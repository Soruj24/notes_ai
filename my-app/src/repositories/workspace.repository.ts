import type { MemberRole, WorkspaceStatus } from "@/src/lib/db/enums";
import { ConflictError, ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { User } from "@/src/models/user.model";
import { Workspace } from "@/src/models/workspace.model";
import { WorkspaceMember } from "@/src/models/workspace-member.model";
import {
  db,
  oid,
  requireMembership,
  requireRole,
  requireWritableMembership,
  serialize,
  serializeMany,
} from "@/src/repositories/base";

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: WorkspaceStatus;
  role?: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(
  doc: {
    _id: unknown;
    name: string;
    description?: string;
    ownerId: unknown;
    status?: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  role?: MemberRole,
): WorkspaceRecord {
  const record = serialize<WorkspaceRecord>(doc as never);
  // Pre-status documents normalize to ACTIVE.
  if (typeof record.status !== "string") record.status = "ACTIVE";
  return { ...record, role };
}

/**
 * Create a workspace + owner membership. Sequential (no transaction) so this
 * works on standalone MongoDB; the membership write is compensated on failure.
 */
export async function createWorkspace(input: {
  ownerUserId: string;
  name: string;
  description?: string;
}): Promise<WorkspaceRecord> {
  await db();
  const owner = await User.findById(oid(input.ownerUserId, "ownerUserId")).lean();
  if (!owner) throw new NotFoundError("User not found.");

  const ws = await Workspace.create({
    name: input.name,
    description: input.description,
    ownerId: owner._id,
  });
  try {
    await WorkspaceMember.create({
      workspaceId: ws._id,
      userId: owner._id,
      role: "owner",
    });
  } catch (err) {
    await Workspace.deleteOne({ _id: ws._id });
    throw err;
  }
  return toRecord(ws.toObject(), "owner");
}

export async function listWorkspacesForUser(
  userId: string,
): Promise<WorkspaceRecord[]> {
  await db();
  const memberships = await WorkspaceMember.find({
    userId: oid(userId, "userId"),
  })
    .sort({ createdAt: 1 })
    .lean();
  if (!memberships.length) return [];
  const roleByWorkspace = new Map(
    memberships.map((m) => [String(m.workspaceId), m.role as MemberRole]),
  );
  const workspaces = await Workspace.find({
    _id: { $in: memberships.map((m) => m.workspaceId) },
  }).lean();
  return serializeMany<WorkspaceRecord>(
    workspaces.map((w) => ({
      ...w,
      role: roleByWorkspace.get(String(w._id)),
    })) as never[],
  );
}

export async function getWorkspace(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const ws = await Workspace.findById(member.workspaceId).lean();
  if (!ws) throw new NotFoundError("Workspace not found.");
  return toRecord(ws, member.role);
}

export interface WorkspaceAdminRecord extends WorkspaceRecord {
  memberCount: number;
}

function workspaceSearchFilter(search?: string): Record<string, unknown> {
  const q = search?.trim();
  if (!q) return {};
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { name: new RegExp(escaped, "i") };
}

export type WorkspaceSortKey = "createdAt" | "updatedAt" | "name";
export type WorkspaceSortDir = "asc" | "desc";

export interface WorkspaceListFilters {
  search?: string;
  status?: WorkspaceStatus;
  sort?: WorkspaceSortKey;
  dir?: WorkspaceSortDir;
  limit?: number;
  offset?: number;
}

function adminListFilter(
  input: Pick<WorkspaceListFilters, "search" | "status">,
): Record<string, unknown> {
  const filter = workspaceSearchFilter(input.search);
  if (input.status) filter.status = input.status;
  return filter;
}

function workspaceSortSpec(sort?: WorkspaceSortKey, dir?: WorkspaceSortDir): Record<string, 1 | -1> {
  const column = sort === "name" || sort === "updatedAt" ? sort : "createdAt";
  const direction = dir === "asc" ? 1 : -1;
  return column === "createdAt" ? { [column]: direction } : { [column]: direction, createdAt: -1 };
}

/** Admin-only cross-workspace listing with member counts. */
export async function listAllWorkspaces(
  input: WorkspaceListFilters = {},
): Promise<WorkspaceAdminRecord[]> {
  await db();
  const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 100);
  const offset = Math.max(Number(input.offset) || 0, 0);
  const docs = await Workspace.find(adminListFilter(input))
    .sort(workspaceSortSpec(input.sort, input.dir))
    .skip(offset)
    .limit(limit)
    .lean();
  const ids = docs.map((d) => d._id);
  const counts = await WorkspaceMember.aggregate([
    { $match: { workspaceId: { $in: ids } } },
    { $group: { _id: "$workspaceId", n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n as number]));
  return docs.map((d) => ({
    ...toRecord(d),
    memberCount: byId.get(String(d._id)) ?? 0,
  }));
}

export async function countAllWorkspaces(
  searchOrFilters?: string | Pick<WorkspaceListFilters, "search" | "status">,
): Promise<number> {
  await db();
  const filter =
    typeof searchOrFilters === "string" || searchOrFilters === undefined
      ? workspaceSearchFilter(searchOrFilters)
      : adminListFilter(searchOrFilters);
  return Workspace.countDocuments(filter);
}

/** Admin-only unscoped workspace fetch (no membership). Callers enforce workspaces.view. */
export async function getWorkspaceByIdAdmin(workspaceId: string): Promise<WorkspaceRecord> {
  await db();
  const ws = await Workspace.findById(oid(workspaceId, "workspaceId")).lean();
  if (!ws) throw new NotFoundError("Workspace not found.");
  return toRecord(ws);
}

/** Admin-only unscoped lifecycle writer. Guards + audit live in the service. */
export async function setWorkspaceStatus(
  workspaceId: string,
  status: WorkspaceStatus,
): Promise<WorkspaceRecord> {
  await db();
  const ws = await Workspace.findOneAndUpdate(
    { _id: oid(workspaceId, "workspaceId") },
    { $set: { status } },
    { new: true },
  ).lean();
  if (!ws) throw new NotFoundError("Workspace not found.");
  return toRecord(ws);
}

export interface WorkspaceMemberAdminRecord {
  userId: string;
  name: string;
  email: string;
  status: string;
  role: MemberRole;
  joinedAt: Date;
}

/** Admin-only member roster with user profiles. */
export async function listWorkspaceMembersAdmin(
  workspaceId: string,
): Promise<WorkspaceMemberAdminRecord[]> {
  await db();
  const wid = oid(workspaceId, "workspaceId");
  const memberships = await WorkspaceMember.find({ workspaceId: wid })
    .sort({ createdAt: 1 })
    .lean();
  if (!memberships.length) return [];
  const users = await User.find({ _id: { $in: memberships.map((m) => m.userId) } })
    .select({ name: 1, email: 1, status: 1 })
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return memberships.map((m) => {
    const u = byId.get(String(m.userId));
    return {
      userId: String(m.userId),
      name: (u?.name as string | undefined) ?? "(deleted user)",
      email: (u?.email as string | undefined) ?? "",
      status: (u?.status as string | undefined) ?? "DELETED",
      role: m.role as MemberRole,
      joinedAt: m.createdAt,
    };
  });
}

export interface WorkspaceStats {
  members: number;
  notes: number;
  tasks: number;
  tasksDone: number;
  projects: number;
  goals: number;
  attachments: number;
  storageBytes: number;
  aiConversations: number;
  aiMessages: number;
  aiTokens: number;
}

/** Admin-only per-workspace rollup for the inspect view. All live counts. */
export async function getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
  await db();
  const wid = oid(workspaceId, "workspaceId");
  const { Note } = await import("@/src/models/note.model");
  const { Task } = await import("@/src/models/task.model");
  const { Project } = await import("@/src/models/project.model");
  const { Goal } = await import("@/src/models/goal.model");
  const { Attachment } = await import("@/src/models/attachment.model");
  const { AiConversation } = await import("@/src/models/ai-conversation.model");
  const { AiMessage } = await import("@/src/models/ai-message.model");

  const [members, notes, tasks, tasksDone, projects, goals, attachments, conversations] =
    await Promise.all([
      WorkspaceMember.countDocuments({ workspaceId: wid }),
      Note.countDocuments({ workspaceId: wid }),
      Task.countDocuments({ workspaceId: wid }),
      Task.countDocuments({ workspaceId: wid, status: "done" }),
      Project.countDocuments({ workspaceId: wid }),
      Goal.countDocuments({ workspaceId: wid }),
      Attachment.aggregate([
        { $match: { workspaceId: wid } },
        { $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: "$size" } } },
      ]) as Promise<Array<{ _id: null; n: number; bytes: number }>>,
      AiConversation.find({ workspaceId: wid }).select({ _id: 1 }).lean(),
    ]);
  const convIds = conversations.map((c) => c._id);
  const aiMessages =
    convIds.length === 0
      ? []
      : ((await AiMessage.aggregate([
          { $match: { conversationId: { $in: convIds } } },
          {
            $group: {
              _id: null,
              n: { $sum: 1 },
              tokens: {
                $sum: { $add: [{ $ifNull: ["$inputTokens", 0] }, { $ifNull: ["$outputTokens", 0] }] },
              },
            },
          },
        ])) as Array<{ _id: null; n: number; tokens: number }>);
  const files = attachments[0];
  const ai = aiMessages[0];
  return {
    members,
    notes,
    tasks,
    tasksDone,
    projects,
    goals,
    attachments: files?.n ?? 0,
    storageBytes: files?.bytes ?? 0,
    aiConversations: convIds.length,
    aiMessages: ai?.n ?? 0,
    aiTokens: ai?.tokens ?? 0,
  };
}

export interface WorkspaceContentItem {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
}

export interface WorkspaceContent {
  notes: WorkspaceContentItem[];
  tasks: WorkspaceContentItem[];
  projects: WorkspaceContentItem[];
  goals: WorkspaceContentItem[];
}

/**
 * Admin-only recent content (titles + status, never bodies — the PII rule:
 * full-body reveal is a separate audited action, out of scope here).
 */
export async function listWorkspaceContentAdmin(
  workspaceId: string,
  limit = 8,
): Promise<WorkspaceContent> {
  await db();
  const wid = oid(workspaceId, "workspaceId");
  const n = Math.min(Math.max(limit, 1), 25);
  const { Note } = await import("@/src/models/note.model");
  const { Task } = await import("@/src/models/task.model");
  const { Project } = await import("@/src/models/project.model");
  const { Goal } = await import("@/src/models/goal.model");

  const [notes, tasks, projects, goals] = await Promise.all([
    Note.find({ workspaceId: wid }).sort({ updatedAt: -1 }).limit(n).select({ title: 1, updatedAt: 1 }).lean(),
    Task.find({ workspaceId: wid }).sort({ updatedAt: -1 }).limit(n).select({ title: 1, status: 1, updatedAt: 1 }).lean(),
    Project.find({ workspaceId: wid }).sort({ updatedAt: -1 }).limit(n).select({ name: 1, status: 1, updatedAt: 1 }).lean(),
    Goal.find({ workspaceId: wid }).sort({ updatedAt: -1 }).limit(n).select({ title: 1, status: 1, updatedAt: 1 }).lean(),
  ]);
  return {
    notes: notes.map((d) => ({ id: String(d._id), title: d.title as string, status: "", updatedAt: d.updatedAt as Date })),
    tasks: tasks.map((d) => ({
      id: String(d._id),
      title: d.title as string,
      status: d.status as string,
      updatedAt: d.updatedAt as Date,
    })),
    projects: projects.map((d) => ({
      id: String(d._id),
      title: d.name as string,
      status: d.status as string,
      updatedAt: d.updatedAt as Date,
    })),
    goals: goals.map((d) => ({
      id: String(d._id),
      title: d.title as string,
      status: d.status as string,
      updatedAt: d.updatedAt as Date,
    })),
  };
}

export interface UserMembershipRecord {
  workspaceId: string;
  workspaceName: string;
  role: MemberRole;
  joinedAt: Date;
}

/** Admin-only: every workspace a user belongs to, with names. */
export async function listMembershipsForUser(userId: string): Promise<UserMembershipRecord[]> {
  await db();
  const memberships = await WorkspaceMember.find({ userId: oid(userId, "userId") })
    .sort({ createdAt: 1 })
    .lean();
  if (!memberships.length) return [];
  const workspaces = await Workspace.find({
    _id: { $in: memberships.map((m) => m.workspaceId) },
  })
    .select({ name: 1 })
    .lean();
  const names = new Map(workspaces.map((w) => [String(w._id), w.name as string]));
  return memberships.map((m) => ({
    workspaceId: String(m.workspaceId),
    workspaceName: names.get(String(m.workspaceId)) ?? "(deleted workspace)",
    role: m.role as MemberRole,
    joinedAt: m.createdAt,
  }));
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  input: { name?: string; description?: string },
): Promise<WorkspaceRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  requireRole(member, ["owner", "admin"]);
  await db();
  const ws = await Workspace.findOneAndUpdate(
    { _id: member.workspaceId },
    { $set: input },
    { new: true },
  ).lean();
  if (!ws) throw new NotFoundError("Workspace not found.");
  return toRecord(ws, member.role);
}

export async function addWorkspaceMember(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
}): Promise<void> {
  const member = await requireWritableMembership(input.actorUserId, input.workspaceId);
  requireRole(member, ["owner", "admin"]);
  if (input.role === "owner") requireRole(member, ["owner"]);
  await db();
  const target = await User.findById(oid(input.userId, "userId")).lean();
  if (!target) throw new NotFoundError("User not found.");
  try {
    await WorkspaceMember.create({
      workspaceId: member.workspaceId,
      userId: target._id,
      role: input.role,
    });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      throw new ConflictError("User is already a member.");
    }
    throw err;
  }
}

export async function removeWorkspaceMember(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  const member = await requireWritableMembership(input.actorUserId, input.workspaceId);
  requireRole(member, ["owner", "admin"]);
  await db();
  const target = await WorkspaceMember.findOne({
    workspaceId: member.workspaceId,
    userId: oid(input.userId, "userId"),
  });
  if (!target) throw new NotFoundError("Membership not found.");
  if (target.role === "owner") {
    const owners = await WorkspaceMember.countDocuments({
      workspaceId: member.workspaceId,
      role: "owner",
    });
    if (owners <= 1) throw new ForbiddenError("Cannot remove the last owner.");
  }
  await target.deleteOne();
}

export async function setMemberRole(input: {
  actorUserId: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
}): Promise<void> {
  const member = await requireWritableMembership(input.actorUserId, input.workspaceId);
  requireRole(member, ["owner"]);
  await db();
  const updated = await WorkspaceMember.findOneAndUpdate(
    { workspaceId: member.workspaceId, userId: oid(input.userId, "userId") },
    { $set: { role: input.role } },
    { new: true },
  );
  if (!updated) throw new NotFoundError("Membership not found.");
}
