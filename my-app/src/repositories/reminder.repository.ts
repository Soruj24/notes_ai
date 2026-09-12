import type { Recurrence, ReminderChannel, ReminderStatus } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Reminder } from "@/src/models/reminder.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface ReminderRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  remindAt: Date;
  channel: ReminderChannel;
  status: ReminderStatus;
  snoozedUntil?: Date;
  taskId?: string;
  eventId?: string;
  noteId?: string;
  recurrence: Recurrence;
  recurrenceUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderFilters {
  status?: ReminderStatus;
  dueBefore?: Date;
  limit?: number;
}

function toRecord(doc: Record<string, unknown>): ReminderRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    title: doc.title as string,
    remindAt: doc.remindAt as Date,
    channel: doc.channel as ReminderChannel,
    status: doc.status as ReminderStatus,
    snoozedUntil: doc.snoozedUntil as Date | undefined,
    taskId: doc.taskId ? String(doc.taskId) : undefined,
    eventId: doc.eventId ? String(doc.eventId) : undefined,
    noteId: doc.noteId ? String(doc.noteId) : undefined,
    recurrence: (doc.recurrence ?? "none") as Recurrence,
    recurrenceUntil: doc.recurrenceUntil as Date | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listReminders(
  userId: string,
  workspaceId: string,
  filters: ReminderFilters = {},
): Promise<ReminderRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (filters.status) query.status = filters.status;
  if (filters.dueBefore) query.remindAt = { $lte: filters.dueBefore };
  const docs = await Reminder.find(query)
    .sort({ remindAt: 1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/** Due reminders across one workspace (used by the dispatch worker). */
export async function listDueReminders(
  workspaceId: string,
  now = new Date(),
): Promise<ReminderRecord[]> {
  await db();
  const docs = await Reminder.find({
    workspaceId: oid(workspaceId, "workspaceId"),
    status: { $in: ["pending", "snoozed"] },
    $or: [{ remindAt: { $lte: now } }, { snoozedUntil: { $lte: now } }],
  })
    .sort({ remindAt: 1 })
    .limit(200)
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/** Cross-workspace due scan for the cron worker (no membership gate). */
export async function listAllDueReminders(now = new Date(), limit = 500): Promise<ReminderRecord[]> {
  await db();
  const docs = await Reminder.find({
    status: { $in: ["pending", "snoozed"] },
    $or: [{ remindAt: { $lte: now } }, { snoozedUntil: { $lte: now } }],
  })
    .sort({ remindAt: 1 })
    .limit(Math.min(Math.max(limit, 1), 1000))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/** Worker-side status flip (ownership already established by the scan). */
export async function markReminderSent(reminderId: string): Promise<void> {
  await db();
  await Reminder.updateOne(
    { _id: oid(reminderId, "reminderId") },
    { $set: { status: "sent" } },
  );
}

export async function createReminder(input: {
  userId: string;
  workspaceId: string;
  title: string;
  remindAt: Date;
  channel?: ReminderChannel;
  taskId?: string;
  eventId?: string;
  noteId?: string;
  recurrence?: Recurrence;
  recurrenceUntil?: Date;
}): Promise<ReminderRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Reminder.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    title: input.title,
    remindAt: input.remindAt,
    channel: input.channel ?? "in_app",
    taskId: input.taskId ? oid(input.taskId, "taskId") : undefined,
    eventId: input.eventId ? oid(input.eventId, "eventId") : undefined,
    noteId: input.noteId ? oid(input.noteId, "noteId") : undefined,
    recurrence: input.recurrence ?? "none",
    recurrenceUntil: input.recurrenceUntil,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateReminder(input: {
  userId: string;
  workspaceId: string;
  reminderId: string;
  title?: string;
  remindAt?: Date;
  status?: ReminderStatus;
  snoozedUntil?: Date | null;
}): Promise<ReminderRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Reminder.findOne({
    _id: oid(input.reminderId, "reminderId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Reminder not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.title !== undefined) doc.title = input.title;
  if (input.remindAt !== undefined) doc.remindAt = input.remindAt;
  if (input.status !== undefined) doc.status = input.status;
  if (input.snoozedUntil !== undefined)
    doc.snoozedUntil = input.snoozedUntil ?? undefined;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteReminder(
  userId: string,
  workspaceId: string,
  reminderId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Reminder.findOne({
    _id: oid(reminderId, "reminderId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Reminder not found.");
  assertCanWrite(member, doc.ownerId);
  await doc.deleteOne();
}
