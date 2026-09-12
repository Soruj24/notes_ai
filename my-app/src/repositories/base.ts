import { Types } from "mongoose";
import { connectDb } from "@/src/lib/db/connection";
import {
  ELEVATED_ROLES,
  READ_ONLY_ROLES,
  type MemberRole,
  type WorkspaceStatus,
} from "@/src/lib/db/enums";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/src/lib/db/errors";
import { Workspace } from "@/src/models/workspace.model";
import {
  WorkspaceMember,
  type WorkspaceMemberDocument,
} from "@/src/models/workspace-member.model";

/**
 * Shared repository plumbing: connection, id parsing, membership gating,
 * ownership checks, and lean serialization. No component may import models
 * directly — everything goes through repositories/services.
 */

/** Ensure the cached connection before any query. */
export async function db(): Promise<void> {
  await connectDb();
}

export function oid(id: string, field = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new ValidationError({ [field]: ["Invalid identifier."] });
  }
  return new Types.ObjectId(id);
}

/**
 * Membership gate: non-members see "not found" (no existence leak).
 * Also the central lifecycle enforcer — SUSPENDED/DELETED workspaces
 * reject ALL member access (reads and writes), so an admin suspend
 * takes effect through the service layer instead of being a label.
 * Pre-status documents normalize to ACTIVE.
 */
export async function requireMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMemberDocument> {
  await connectDb();
  const member = await WorkspaceMember.findOne({
    workspaceId: oid(workspaceId, "workspaceId"),
    userId: oid(userId, "userId"),
  });
  if (!member) throw new NotFoundError("Workspace not found.");
  const status = await readWorkspaceStatus(member.workspaceId);
  if (status === "SUSPENDED" || status === "DELETED") {
    throw new ForbiddenError(`This workspace is ${status.toLowerCase()}.`);
  }
  return member;
}

/** Archived workspaces are read-only: mutating paths use this gate. */
export async function requireWritableMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMemberDocument> {
  const member = await requireMembership(userId, workspaceId);
  const status = await readWorkspaceStatus(member.workspaceId);
  if (status === "ARCHIVED") {
    throw new ForbiddenError("This workspace is archived and read-only.");
  }
  return member;
}

async function readWorkspaceStatus(workspaceId: Types.ObjectId): Promise<WorkspaceStatus> {
  const ws = await Workspace.findById(workspaceId).select({ status: 1 }).lean();
  if (!ws) throw new NotFoundError("Workspace not found.");
  const status = (ws.status as WorkspaceStatus | undefined) ?? "ACTIVE";
  return status;
}

export function requireRole(
  member: WorkspaceMemberDocument,
  roles: readonly MemberRole[],
  message = "Insufficient permissions.",
): void {
  if (!roles.includes(member.role)) throw new ForbiddenError(message);
}

/** Owners/admins may touch anything; members their own docs; viewers read-only. */
export function assertCanWrite(
  member: WorkspaceMemberDocument,
  ownerId: Types.ObjectId | string,
): void {
  if (READ_ONLY_ROLES.includes(member.role)) {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  if (ELEVATED_ROLES.includes(member.role)) return;
  if (String(ownerId) !== String(member.userId)) {
    throw new ForbiddenError("Only the owner can modify this.");
  }
}

export function clampLimit(value: unknown, def = 50, max = 200): number {
  const n = typeof value === "number" ? value : def;
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

interface LeanDoc {
  _id: unknown;
  __v?: unknown;
  [key: string]: unknown;
}

/** Convert lean() results to API-safe objects with string ids. */
export function serialize<T>(doc: LeanDoc): T {
  const { _id, ...rest } = doc;
  delete rest.__v;
  return { id: String(_id), ...rest } as T;
}

export function serializeMany<T>(docs: LeanDoc[]): T[] {
  return docs.map((d) => serialize<T>(d));
}
