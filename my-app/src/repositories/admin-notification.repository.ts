import { AdminNotification } from "@/src/models/admin-notification.model";
import { clampLimit, db, oid } from "@/src/repositories/base";
import type {
  AdminNotificationPriority,
  AdminNotificationSeverity,
  AdminNotificationSource,
} from "@/src/lib/db/admin-enums";

export interface AdminNotificationRecord {
  id: string;
  title: string;
  body: string;
  severity: AdminNotificationSeverity;
  priority: AdminNotificationPriority;
  source: AdminNotificationSource;
  targetRole?: string;
  linkHref?: string;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminNotificationFilters {
  severity?: AdminNotificationSeverity;
  priority?: AdminNotificationPriority;
  source?: AdminNotificationSource;
  /** "read" | "unread" for a staff member. */
  read?: "read" | "unread";
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): AdminNotificationRecord {
  return {
    id: String(doc._id),
    title: doc.title as string,
    body: doc.body as string,
    severity: (doc.severity as AdminNotificationSeverity | undefined) ?? "info",
    priority: (doc.priority as AdminNotificationPriority | undefined) ?? "normal",
    source: (doc.source as AdminNotificationSource | undefined) ?? "system",
    targetRole: doc.targetRole as string | undefined,
    linkHref: doc.linkHref as string | undefined,
    readBy: ((doc.readBy ?? []) as unknown[]).map(String),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

function escapeRegExp(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuery(filters: AdminNotificationFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.severity) query.severity = filters.severity;
  if (filters.priority) query.priority = filters.priority;
  if (filters.source) query.source = filters.source;
  if (filters.read && filters.userId) {
    const uid = oid(filters.userId, "userId");
    query.readBy = filters.read === "read" ? uid : { $ne: uid };
  }
  if (filters.search?.trim()) {
    query.title = new RegExp(escapeRegExp(filters.search.trim()), "i");
  }
  return query;
}

export async function createAdminNotification(input: {
  title: string;
  body: string;
  severity?: AdminNotificationSeverity;
  priority?: AdminNotificationPriority;
  source?: AdminNotificationSource;
  targetRole?: string;
  linkHref?: string;
}): Promise<AdminNotificationRecord> {
  await db();
  const doc = await AdminNotification.create({ ...input });
  return toRecord(doc.toObject());
}

/** Console inbox: global items plus items targeted at any of `roles`. */
export async function listAdminNotifications(
  roles: string[] = [],
  limit?: number,
): Promise<AdminNotificationRecord[]> {
  await db();
  const query =
    roles.length > 0
      ? { $or: [{ targetRole: null }, { targetRole: { $in: roles } }] }
      : {};
  const docs = await AdminNotification.find(query)
    .sort({ createdAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map(toRecord);
}

export async function listAdminNotificationsFiltered(
  filters: AdminNotificationFilters,
): Promise<AdminNotificationRecord[]> {
  await db();
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const docs = await AdminNotification.find(buildQuery(filters))
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map(toRecord);
}

export async function countAdminNotifications(
  filters: AdminNotificationFilters = {},
): Promise<number> {
  await db();
  return AdminNotification.countDocuments(buildQuery(filters));
}

/** Unacknowledged critical items (console triage metric). */
export async function countCriticalUnacked(): Promise<number> {
  await db();
  return AdminNotification.countDocuments({
    severity: "critical",
    $or: [{ readBy: { $exists: false } }, { readBy: { $size: 0 } }],
  });
}

export async function markAdminNotificationRead(id: string, userId: string): Promise<void> {
  await db();
  await AdminNotification.updateOne(
    { _id: oid(id) },
    { $addToSet: { readBy: oid(userId, "userId") } },
  );
}

/** Existence check for acknowledge flows (throws NotFoundError). */
export async function requireAdminNotification(id: string): Promise<void> {
  await db();
  const doc = await AdminNotification.findById(oid(id, "id")).select({ _id: 1 }).lean();
  if (!doc) {
    const { NotFoundError } = await import("@/src/lib/db/errors");
    throw new NotFoundError("Notification not found.");
  }
}

/** Recent same-title check for noisy-repeater dedupe. */
export async function hasRecentNotificationByTitle(title: string, since: Date): Promise<boolean> {
  await db();
  const doc = await AdminNotification.findOne({ title, createdAt: { $gte: since } })
    .select({ _id: 1 })
    .lean();
  return doc !== null;
}

/** Mark every inbox item read for one staff member. Returns the count. */
export async function markAllAdminNotificationsRead(userId: string): Promise<number> {
  await db();
  const res = await AdminNotification.updateMany(
    { readBy: { $ne: oid(userId, "userId") } },
    { $addToSet: { readBy: oid(userId, "userId") } },
  );
  return res.modifiedCount ?? 0;
}

export async function deleteAdminNotification(id: string): Promise<boolean> {
  await db();
  const res = await AdminNotification.deleteOne({ _id: oid(id) });
  return res.deletedCount > 0;
}
