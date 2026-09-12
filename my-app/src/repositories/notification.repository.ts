import type { NotificationStatus, NotificationType } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Notification } from "@/src/models/notification.model";
import {
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  status: NotificationStatus;
  readAt?: Date;
  linkHref?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): NotificationRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    userId: String(doc.userId),
    type: doc.type as NotificationType,
    title: doc.title as string,
    body: doc.body as string | undefined,
    status: doc.status as NotificationStatus,
    readAt: doc.readAt as Date | undefined,
    linkHref: doc.linkHref as string | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listNotifications(
  userId: string,
  workspaceId: string,
  filters: { status?: NotificationStatus; limit?: number } = {},
): Promise<NotificationRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = {
    workspaceId: member.workspaceId,
    userId: member.userId,
  };
  if (filters.status) query.status = filters.status;
  const docs = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function createNotification(input: {
  workspaceId: string;
  userId: string;
  type?: NotificationType;
  title: string;
  body?: string;
  linkHref?: string;
}): Promise<NotificationRecord> {
  const member = await requireMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Notification.create({
    workspaceId: member.workspaceId,
    userId: member.userId,
    type: input.type ?? "system",
    title: input.title,
    body: input.body,
    linkHref: input.linkHref,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function markNotificationRead(
  userId: string,
  workspaceId: string,
  notificationId: string,
): Promise<NotificationRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Notification.findOne({
    _id: oid(notificationId, "notificationId"),
    workspaceId: member.workspaceId,
    userId: member.userId,
  });
  if (!doc) throw new NotFoundError("Notification not found.");
  doc.status = "read";
  doc.readAt = new Date();
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function markAllNotificationsRead(
  userId: string,
  workspaceId: string,
): Promise<number> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const res = await Notification.updateMany(
    {
      workspaceId: member.workspaceId,
      userId: member.userId,
      status: "unread",
    },
    { $set: { status: "read", readAt: new Date() } },
  );
  return res.modifiedCount;
}

export async function archiveNotification(
  userId: string,
  workspaceId: string,
  notificationId: string,
): Promise<NotificationRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Notification.findOne({
    _id: oid(notificationId, "notificationId"),
    workspaceId: member.workspaceId,
    userId: member.userId,
  });
  if (!doc) throw new NotFoundError("Notification not found.");
  if (member.role === "viewer" && String(doc.userId) !== String(member.userId)) {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  doc.status = "archived";
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}
