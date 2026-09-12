import type { UserStatus } from "@/src/lib/db/admin-enums";
import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/src/lib/db/errors";
import { canActOnTarget, canGrantRole, hasPermission, type PlatformRole } from "@/src/lib/rbac/roles";
import type { Permission } from "@/src/lib/rbac/permissions";
import {
  countActiveSuperAdmins,
  countUsers,
  findUserById,
  listUsers,
  setUserPlatformRole,
  setUserStatus,
  updateUserName,
  type UserRecord,
} from "@/src/repositories/user.repository";
import {
  deleteSessionsForUser,
  listSessionsForUser,
} from "@/src/repositories/session.repository";
import { listMembershipsForUser } from "@/src/repositories/workspace.repository";
import { listActivityByActor } from "@/src/repositories/activity-log.repository";
import { listAuditEvents, recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import type { UserListQuery } from "@/src/lib/validation/users";

/**
 * Admin user management. Every mutation enforces its permission against
 * the actor's DB-read role (defense in depth — routes check too) and
 * writes an append-only audit entry before returning success.
 *
 * Lifecycle semantics mirror the User model: only ACTIVE authenticates;
 * BANNED/DELETED keep the record for audit while blocking auth. "Delete"
 * is therefore a DELETED transition plus session revocation — never a
 * hard document removal.
 */

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole | null;
  status: UserStatus;
  isAdmin: boolean;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
}

export interface DetailedUser extends SafeUser {
  /** Staff-only. Never sent to the user themselves via user paths. */
  suspensionReason?: string;
}

export function toSafeUser(u: UserRecord): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    isAdmin: u.isAdmin,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toDetailedUser(u: UserRecord): DetailedUser {
  return { ...toSafeUser(u), suspensionReason: u.suspensionReason };
}

async function requirePerm(
  staff: PlatformUser,
  permission: Permission,
  message: string,
  ctx?: RequestContext,
  targetId?: string,
): Promise<void> {
  if (hasPermission(staff.role, permission)) return;
  // Defense-in-depth rejections are still visible: route gates log first,
  // and this covers transitions needing a stronger permission than the gate.
  if (ctx && targetId) {
    await logGuardDenial(staff, targetId, "permission", ctx);
  }
  throw new ForbiddenError(message);
}

async function getTargetOrThrow(id: string): Promise<UserRecord> {
  const target = await findUserById(id);
  if (!target) throw new NotFoundError("User not found.");
  return target;
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
    resourceType: "user",
    resourceId: targetId,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

/**
 * Best-effort denial trail for privilege-guard rejections (self-action,
 * rank, last-superadmin, grant rules). The 403 always stands; logging
 * must never mask it.
 */
async function logGuardDenial(
  staff: PlatformUser,
  targetId: string,
  guard: string,
  ctx: RequestContext,
): Promise<void> {
  try {
    await recordAuditEvent({
      actorId: staff.user.id,
      actorRole: staff.role,
      action: "ADMIN_ACCESS_DENIED",
      resourceType: "user",
      resourceId: targetId,
      metadata: { guard },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      result: "denied",
    });
  } catch {
    // Denial stands regardless of logging.
  }
}

async function deny(
  staff: PlatformUser,
  targetId: string,
  guard: string,
  ctx: RequestContext,
  message: string,
): Promise<never> {
  await logGuardDenial(staff, targetId, guard, ctx);
  throw new ForbiddenError(message);
}

export async function getUsersList(query: UserListQuery): Promise<{ users: SafeUser[]; total: number }> {
  const filters = { search: query.search, status: query.status, role: query.role };
  const [users, total] = await Promise.all([
    listUsers({ ...filters, sort: query.sort, dir: query.dir, limit: query.limit, offset: query.offset }),
    countUsers(filters),
  ]);
  return { users: users.map(toSafeUser), total };
}

export async function getUserDetail(id: string): Promise<DetailedUser> {
  return toDetailedUser(await getTargetOrThrow(id));
}

export async function updateUserDisplayName(
  staff: PlatformUser,
  id: string,
  name: string,
  ctx: RequestContext,
): Promise<DetailedUser> {
  await requirePerm(staff, "users.update", "Insufficient permissions.", ctx, id);
  const before = await getTargetOrThrow(id);
  if (before.name !== name) {
    await updateUserName(id, name);
    await audit(staff, "USER_UPDATED", id, { before: { name: before.name }, after: { name } }, ctx);
  }
  return toDetailedUser(await getTargetOrThrow(id));
}

/** SUSPENDED↔ACTIVE needs users.suspend; anything touching BANNED/DELETED needs users.delete. */
function requiredStatusPermission(from: UserStatus, to: UserStatus): Permission | null {
  if (from === to) return null;
  if (to === "SUSPENDED" || (from === "SUSPENDED" && to === "ACTIVE")) return "users.suspend";
  return "users.delete";
}

/** Canonical audit vocabulary (SCREAMING_SNAKE, stable API). */
function statusAction(from: UserStatus, to: UserStatus): string {
  if (to === "SUSPENDED") return "USER_SUSPENDED";
  if (to === "BANNED") return "USER_BANNED";
  if (to === "DELETED") return "USER_DELETED";
  if (from === "SUSPENDED") return "USER_UNSUSPENDED";
  return "USER_RESTORED";
}

/** The last active superadmin cannot be locked out or demoted by anyone. */
async function assertNotLastSuperAdmin(target: UserRecord): Promise<void> {
  if (target.role === "SUPER_ADMIN" && target.status === "ACTIVE") {
    const remaining = await countActiveSuperAdmins();
    if (remaining <= 1) {
      throw new ForbiddenError("Cannot remove the last active superadmin.");
    }
  }
}

export async function changeUserStatus(
  staff: PlatformUser,
  id: string,
  status: UserStatus,
  reason: string | undefined,
  ctx: RequestContext,
): Promise<DetailedUser> {
  const before = await getTargetOrThrow(id);
  const needed = requiredStatusPermission(before.status, status);
  if (needed) await requirePerm(staff, needed, "Insufficient permissions.", ctx, id);
  if (!needed) return toDetailedUser(before); // no-op
  if (status !== "ACTIVE" && !reason) {
    throw new ValidationError({ reason: ["A reason is required for this action."] });
  }
  if (staff.user.id === id) {
    return deny(staff, id, "self-mutation", ctx, "You cannot change your own account status.");
  }
  // Vertical containment: strictly higher rank required (peers never act
  // on peers — a compromised ADMIN cannot suspend fellow ADMINs).
  if (!canActOnTarget(staff.role, before.role)) {
    return deny(staff, id, "rank", ctx, "Insufficient permissions.");
  }
  try {
    await assertNotLastSuperAdmin(before);
  } catch {
    await logGuardDenial(staff, id, "last-superadmin", ctx);
    throw new ForbiddenError("Cannot remove the last active superadmin.");
  }
  await setUserStatus(id, status, reason);
  if (status !== "ACTIVE") {
    await deleteSessionsForUser(id); // instant lockout, not just natural expiry
  }
  await audit(
    staff,
    statusAction(before.status, status),
    id,
    { before: { status: before.status }, after: { status }, ...(reason ? { reason } : {}) },
    ctx,
  );
  return toDetailedUser(await getTargetOrThrow(id));
}

export async function changeUserRole(
  staff: PlatformUser,
  id: string,
  role: PlatformRole | null,
  ctx: RequestContext,
): Promise<DetailedUser> {
  const before = await getTargetOrThrow(id);
  if ((before.role ?? null) === role) return toDetailedUser(before); // no-op
  if (staff.user.id === id) {
    return deny(staff, id, "self-mutation", ctx, "You cannot change your own platform role.");
  }
  if (!canActOnTarget(staff.role, before.role)) {
    return deny(staff, id, "rank", ctx, "Insufficient permissions.");
  }
  // Revoking takes away the current role; granting takes on the new one.
  const affected: PlatformRole = role ?? before.role ?? "SUPPORT";
  if (!canGrantRole(staff.role, affected)) {
    return deny(staff, id, "grant", ctx, "Insufficient permissions.");
  }
  if (before.role === "SUPER_ADMIN") {
    try {
      await assertNotLastSuperAdmin(before);
    } catch {
      await logGuardDenial(staff, id, "last-superadmin", ctx);
      throw new ForbiddenError("Cannot remove the last active superadmin.");
    }
  }
  await setUserPlatformRole(id, role);
  await audit(
    staff,
    "USER_ROLE_CHANGED",
    id,
    { before: { role: before.role }, after: { role } },
    ctx,
  );
  return toDetailedUser(await getTargetOrThrow(id));
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export async function getUserSessions(id: string): Promise<SessionSummary[]> {
  await getTargetOrThrow(id);
  const sessions = await listSessionsForUser(id);
  return sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  }));
}

/**
 * Session revoke is a safe account action: any staff who can view the user
 * may revoke (per the permission matrix, Support included).
 */
export async function revokeUserSessions(
  staff: PlatformUser,
  id: string,
  ctx: RequestContext,
): Promise<{ revoked: number }> {
  await requirePerm(staff, "users.view", "Insufficient permissions.", ctx, id);
  await getTargetOrThrow(id);
  if (staff.user.id === id) {
    return deny(staff, id, "self-mutation", ctx, "You cannot revoke your own sessions here. Use sign out instead.");
  }
  const revoked = await deleteSessionsForUser(id);
  await audit(staff, "USER_SESSIONS_REVOKED", id, { revoked }, ctx);
  return { revoked };
}

export interface MembershipSummary {
  workspaceId: string;
  workspaceName: string;
  role: string;
  joinedAt: string;
}

export async function getUserMemberships(id: string): Promise<MembershipSummary[]> {
  await getTargetOrThrow(id);
  const memberships = await listMembershipsForUser(id);
  return memberships.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }));
}

export interface UserActivity {
  activity: Array<{
    id: string;
    workspaceId: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    actorId: string;
    timestamp: string;
  }>;
}

/** Workspace trail (as actor) plus admin-audit entries concerning the user. */
export async function getUserActivity(id: string): Promise<UserActivity> {
  await getTargetOrThrow(id);
  const [activity, audit] = await Promise.all([
    listActivityByActor(id, 25),
    listAuditEvents({ resourceType: "user", resourceId: id, limit: 25 }),
  ]);
  return {
    activity: activity.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt.toISOString(),
    })),
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      timestamp: a.timestamp.toISOString(),
    })),
  };
}
