import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/src/lib/db/errors";
import type { WorkspaceStatus } from "@/src/lib/db/enums";
import { hasPermission } from "@/src/lib/rbac/roles";
import type { Permission } from "@/src/lib/rbac/permissions";
import type { WorkspaceListQuery } from "@/src/lib/validation/workspaces";
import { findUserById } from "@/src/repositories/user.repository";
import {
  countAllWorkspaces,
  getWorkspaceByIdAdmin,
  getWorkspaceStats,
  listAllWorkspaces,
  listWorkspaceContentAdmin,
  listWorkspaceMembersAdmin,
  setWorkspaceStatus,
  type WorkspaceRecord,
} from "@/src/repositories/workspace.repository";
import { listAuditEvents, recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * Admin workspace management. All reads require workspaces.view (route
 * gate); every mutation re-checks its permission here — the Admin UI can
 * never bypass service-layer authorization because the service refuses.
 *
 * Lifecycle mirrors user management: SUSPENDED/ARCHIVED/DELETED are
 * enforced centrally in requireMembership (member lockout / read-only),
 * and "delete" is a DELETED transition that retains the record for audit.
 */

export interface SafeWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: WorkspaceStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceOwner {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string | null;
}

export interface WorkspaceDetail extends Omit<SafeWorkspace, "memberCount"> {
  owner: WorkspaceOwner | null;
  lastStatusChange?: { action: string; timestamp: string; reason?: string };
}

function requirePerm(staff: PlatformUser, permission: Permission): void {
  if (!hasPermission(staff.role, permission)) throw new ForbiddenError("Insufficient permissions.");
}

async function audit(
  staff: PlatformUser,
  action: string,
  targetId: string,
  metadata: Record<string, unknown> | undefined,
  ctx: RequestContext,
): Promise<void> {
  await recordAuditEvent({
    actorId: staff.user.id,
    actorRole: staff.role,
    action,
    resourceType: "workspace",
    resourceId: targetId,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export type SafeWorkspaceWithOwner = SafeWorkspace & { ownerName: string };

export async function getWorkspacesList(
  query: WorkspaceListQuery,
): Promise<{ workspaces: SafeWorkspaceWithOwner[]; total: number }> {
  const filters = { search: query.search, status: query.status };
  const [rows, total] = await Promise.all([
    listAllWorkspaces({
      ...filters,
      sort: query.sort,
      dir: query.dir,
      limit: query.limit,
      offset: query.offset,
    }),
    countAllWorkspaces(filters),
  ]);
  // One owner-name lookup per page (no N+1, no emails to staff list view).
  const ownerIds = [...new Set(rows.map((w) => w.ownerId))];
  const owners = await Promise.all(ownerIds.map((id) => findUserById(id).catch(() => null)));
  const names = new Map(owners.filter((o) => o).map((o) => [o!.id, o!.name]));
  return {
    workspaces: rows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      ownerId: w.ownerId,
      ownerName: names.get(w.ownerId) ?? "(deleted user)",
      status: w.status,
      memberCount: w.memberCount,
      createdAt: w.createdAt.toISOString(),
      updatedAt: (w.updatedAt as Date).toISOString(),
    })),
    total,
  };
}

async function lastStatusChange(id: string): Promise<WorkspaceDetail["lastStatusChange"]> {
  const entries = await listAuditEvents({ resourceType: "workspace", resourceId: id, limit: 25 });
  const entry = entries.find((e) => e.action.startsWith("WORKSPACE_"));
  if (!entry) return undefined;
  const metadata = entry.metadata as { reason?: unknown } | undefined;
  return {
    action: entry.action,
    timestamp: entry.timestamp.toISOString(),
    reason: typeof metadata?.reason === "string" ? metadata.reason : undefined,
  };
}

export async function getWorkspaceDetail(id: string): Promise<WorkspaceDetail> {
  let record: WorkspaceRecord;
  try {
    record = await getWorkspaceByIdAdmin(id);
  } catch (err) {
    if (err instanceof NotFoundError) throw new NotFoundError("Workspace not found.");
    throw err;
  }
  const owner = await findUserById(record.ownerId).catch(() => null);
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    ownerId: record.ownerId,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: (record.updatedAt as Date).toISOString(),
    owner: owner
      ? { id: owner.id, name: owner.name, email: owner.email, status: owner.status, role: owner.role }
      : null,
    lastStatusChange: await lastStatusChange(id),
  };
}

/** Suspend/archive/restore needs workspaces.suspend; anything with DELETED needs workspaces.delete. */
function requiredStatusPermission(from: WorkspaceStatus, to: WorkspaceStatus): Permission | null {
  if (from === to) return null;
  if (to === "DELETED" || from === "DELETED") return "workspaces.delete";
  return "workspaces.suspend";
}

/** Canonical audit vocabulary (SCREAMING_SNAKE, stable API). */
function statusAction(to: WorkspaceStatus, from: WorkspaceStatus): string {
  if (to === "SUSPENDED") return "WORKSPACE_SUSPENDED";
  if (to === "ARCHIVED") return "WORKSPACE_ARCHIVED";
  if (to === "DELETED") return "WORKSPACE_DELETED";
  return from === "SUSPENDED" ? "WORKSPACE_UNSUSPENDED" : "WORKSPACE_RESTORED";
}

export async function changeWorkspaceStatus(
  staff: PlatformUser,
  id: string,
  status: WorkspaceStatus,
  reason: string | undefined,
  ctx: RequestContext,
): Promise<WorkspaceDetail> {
  const before = await getWorkspaceDetail(id);
  const needed = requiredStatusPermission(before.status, status);
  if (needed) requirePerm(staff, needed);
  if (!needed) return before; // no-op
  if (status !== "ACTIVE" && !reason) {
    throw new ValidationError({ reason: ["A reason is required for this action."] });
  }
  await setWorkspaceStatus(id, status);
  await audit(
    staff,
    statusAction(status, before.status),
    id,
    { before: { status: before.status }, after: { status }, ...(reason ? { reason } : {}) },
    ctx,
  );
  return getWorkspaceDetail(id);
}

export async function getWorkspaceMembers(id: string) {
  await getWorkspaceByIdAdmin(id).catch((err) => {
    if (err instanceof NotFoundError) throw new NotFoundError("Workspace not found.");
    throw err;
  });
  const members = await listWorkspaceMembersAdmin(id);
  return members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }));
}

export async function getWorkspaceContent(id: string, limit = 8) {
  await getWorkspaceByIdAdmin(id).catch((err) => {
    if (err instanceof NotFoundError) throw new NotFoundError("Workspace not found.");
    throw err;
  });
  const content = await listWorkspaceContentAdmin(id, limit);
  const iso = <T extends { updatedAt: Date }>(items: T[]) =>
    items.map((i) => ({ ...i, updatedAt: i.updatedAt.toISOString() }));
  return {
    notes: iso(content.notes),
    tasks: iso(content.tasks),
    projects: iso(content.projects),
    goals: iso(content.goals),
  };
}

export async function getWorkspaceStatsDetail(id: string) {
  await getWorkspaceByIdAdmin(id).catch((err) => {
    if (err instanceof NotFoundError) throw new NotFoundError("Workspace not found.");
    throw err;
  });
  return getWorkspaceStats(id);
}
