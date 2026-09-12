import { User } from "@/src/models/user.model";
import { db, oid } from "@/src/repositories/base";
import type { UserStatus } from "@/src/lib/db/admin-enums";
import { normalizeRole, type PlatformRole } from "@/src/lib/rbac/roles";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  /** Platform role; null = regular user with no platform permissions. */
  role: PlatformRole | null;
  status: UserStatus;
  isAdmin: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  suspendedAt?: Date;
  /** Admin-internal. Never serialized to API responses (also stripped by toJSON). */
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecordWithHash extends UserRecord {
  passwordHash: string;
}

function toRecord(doc: {
  _id: unknown;
  name: string;
  email: string;
  role?: unknown;
  status?: unknown;
  isAdmin?: unknown;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    // Fail closed: unknown/corrupt role strings resolve to no permissions.
    role: normalizeRole(doc.role),
    status: (typeof doc.status === "string" ? doc.status : "ACTIVE") as UserStatus,
    isAdmin: Boolean(doc.isAdmin),
    lastLoginAt: doc.lastLoginAt,
    lastActiveAt: doc.lastActiveAt,
    suspendedAt: doc.suspendedAt,
    suspensionReason: doc.suspensionReason,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await db();
  const doc = await User.findById(oid(id)).lean();
  return doc ? toRecord(doc) : null;
}

/** Batch profile lookup (admin email resolution). Skips invalid ids. */
export async function findUsersByIds(ids: string[]): Promise<UserRecord[]> {
  await db();
  const { Types } = await import("mongoose");
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (!objectIds.length) return [];
  const docs = await User.find({ _id: { $in: objectIds } }).lean();
  return docs.map(toRecord);
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await db();
  const doc = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  return doc ? toRecord(doc) : null;
}

function searchFilter(search?: string): Record<string, unknown> {
  const q = search?.trim();
  if (!q) return {};
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escaped, "i");
  return { $or: [{ name: rx }, { email: rx }] };
}

export type UserSortKey = "createdAt" | "lastActiveAt" | "name" | "email";
export type SortDir = "asc" | "desc";

const SORT_COLUMNS: Record<UserSortKey, string> = {
  createdAt: "createdAt",
  lastActiveAt: "lastActiveAt",
  name: "name",
  email: "email",
};

export interface UserListFilters {
  search?: string;
  status?: UserStatus;
  /** Platform role name, or "none" for regular users without a role. */
  role?: string;
  sort?: UserSortKey;
  dir?: SortDir;
  limit?: number;
  offset?: number;
}

function listFilter(input: Pick<UserListFilters, "search" | "status" | "role">): Record<string, unknown> {
  const filter = searchFilter(input.search);
  if (input.status) filter.status = input.status;
  if (input.role === "none") {
    // Matches both absent and explicit-null role fields.
    filter.role = null;
  } else if (input.role) {
    filter.role = input.role;
  }
  return filter;
}

function sortSpec(sort?: UserSortKey, dir?: SortDir): Record<string, 1 | -1> {
  const column = (sort && SORT_COLUMNS[sort]) || "createdAt";
  const direction = dir === "asc" ? 1 : -1;
  // Stable secondary sort keeps pagination deterministic on ties.
  return column === "createdAt" ? { [column]: direction } : { [column]: direction, createdAt: -1 };
}

/** Admin-only cross-user listing. Never includes password hashes (select:false). */
export async function listUsers(input: UserListFilters = {}): Promise<UserRecord[]> {
  await db();
  const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 100);
  const offset = Math.max(Number(input.offset) || 0, 0);
  const docs = await User.find(listFilter(input))
    .sort(sortSpec(input.sort, input.dir))
    .skip(offset)
    .limit(limit)
    .lean();
  return docs.map(toRecord);
}

export async function countUsers(
  searchOrFilters?: string | Pick<UserListFilters, "search" | "status" | "role">,
): Promise<number> {
  await db();
  const filter =
    typeof searchOrFilters === "string" || searchOrFilters === undefined
      ? searchFilter(searchOrFilters)
      : listFilter(searchOrFilters);
  return User.countDocuments(filter);
}

/** Active SUPER_ADMIN count — the last-superadmin guard. */
export async function countActiveSuperAdmins(): Promise<number> {
  await db();
  return User.countDocuments({ role: "SUPER_ADMIN", status: "ACTIVE" });
}

/** Lifecycle breakdown for admin metrics. */
export async function countUsersByStatus(status: UserStatus): Promise<number> {
  await db();
  return User.countDocuments({ status });
}

/** Registrations since a floor date (new-user metric). */
export async function countNewUsers(since: Date): Promise<number> {
  await db();
  return User.countDocuments({ createdAt: { $gte: since } });
}

/** Includes the password hash — auth service only, never serialized. */
export async function findUserWithHash(
  email: string,
): Promise<UserRecordWithHash | null> {
  await db();
  const doc = await User.findOne({ email: email.toLowerCase().trim() })
    .select("+passwordHash")
    .lean();
  if (!doc) return null;
  return { ...toRecord(doc), passwordHash: doc.passwordHash };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserRecord> {
  await db();
  const doc = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
  });
  return toRecord(doc.toObject());
}

export async function updateUserName(id: string, name: string): Promise<void> {
  await db();
  await User.updateOne({ _id: oid(id) }, { $set: { name } });
}

export async function updateUserPasswordHash(
  id: string,
  passwordHash: string,
): Promise<void> {
  await db();
  await User.updateOne({ _id: oid(id) }, { $set: { passwordHash } });
}

/**
 * Single writer for platform role changes. Keeps the denormalized
 * `isAdmin` flag in sync (true for SUPER_ADMIN/ADMIN). Role/permission
 * policy itself lives in `src/lib/rbac/*`; callers must additionally
 * enforce grant rules (canGrantRole) and last-superadmin protection.
 */
export async function setUserPlatformRole(
  id: string,
  role: PlatformRole | null,
): Promise<void> {
  await db();
  if (role) {
    await User.updateOne(
      { _id: oid(id) },
      { $set: { role, isAdmin: role === "SUPER_ADMIN" || role === "ADMIN" } },
    );
  } else {
    await User.updateOne(
      { _id: oid(id) },
      { $unset: { role: "" }, $set: { isAdmin: false } },
    );
  }
}

/**
 * Single writer for lifecycle transitions. Suspending stamps
 * suspendedAt/reason; returning to ACTIVE clears them. BANNED/DELETED
 * keep the record for audit while blocking auth.
 */
export async function setUserStatus(
  id: string,
  status: UserStatus,
  reason?: string,
): Promise<void> {
  await db();
  if (status === "SUSPENDED") {
    await User.updateOne(
      { _id: oid(id) },
      {
        $set: {
          status,
          suspendedAt: new Date(),
          ...(reason ? { suspensionReason: reason.slice(0, 500) } : {}),
        },
      },
    );
  } else if (status === "ACTIVE") {
    await User.updateOne(
      { _id: oid(id) },
      { $set: { status }, $unset: { suspendedAt: "", suspensionReason: "" } },
    );
  } else {
    await User.updateOne({ _id: oid(id) }, { $set: { status } });
  }
}

export async function touchLastLoginAt(id: string): Promise<void> {
  await db();
  const now = new Date();
  await User.updateOne(
    { _id: oid(id) },
    { $set: { lastLoginAt: now, lastActiveAt: now } },
  );
}

export async function touchLastActiveAt(id: string): Promise<void> {
  await db();
  await User.updateOne({ _id: oid(id) }, { $set: { lastActiveAt: new Date() } });
}
