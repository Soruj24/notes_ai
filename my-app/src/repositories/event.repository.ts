import type { EventStatus, Recurrence } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError, ValidationError } from "@/src/lib/db/errors";
import { CalEvent } from "@/src/models/event.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface EventRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  recurrence: Recurrence;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceUntil?: Date;
  location?: string;
  projectId?: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventFilters {
  from?: Date;
  to?: Date;
  status?: EventStatus;
  limit?: number;
}

export type CreateEventInput = {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  recurrence?: Recurrence;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: Date;
  location?: string;
  projectId?: string;
};

function toRecord(doc: Record<string, unknown>): EventRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    title: doc.title as string,
    description: doc.description as string | undefined,
    startsAt: doc.startsAt as Date,
    endsAt: doc.endsAt as Date,
    allDay: Boolean(doc.allDay),
    recurrence: doc.recurrence as Recurrence,
    recurrenceInterval: Number(doc.recurrenceInterval ?? 1),
    recurrenceWeekdays: ((doc.recurrenceWeekdays ?? []) as unknown[]).map(Number),
    recurrenceUntil: doc.recurrenceUntil as Date | undefined,
    location: doc.location as string | undefined,
    projectId: doc.projectId ? String(doc.projectId) : undefined,
    status: doc.status as EventStatus,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listEvents(
  userId: string,
  workspaceId: string,
  filters: EventFilters = {},
): Promise<EventRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    query.startsAt = range;
  }
  if (filters.status) query.status = filters.status;
  const docs = await CalEvent.find(query)
    .sort({ startsAt: 1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function getEvent(
  userId: string,
  workspaceId: string,
  eventId: string,
): Promise<EventRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const doc = await CalEvent.findOne({
    _id: oid(eventId, "eventId"),
    workspaceId: member.workspaceId,
  }).lean();
  if (!doc) throw new NotFoundError("Event not found.");
  return toRecord(doc as Record<string, unknown>);
}

export async function createEvent(input: CreateEventInput): Promise<EventRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  if (input.endsAt < input.startsAt) {
    throw new ValidationError({ endsAt: ["Event end must not precede its start."] });
  }
  await db();
  const doc = await CalEvent.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay ?? false,
    recurrence: input.recurrence ?? "none",
    recurrenceInterval: input.recurrenceInterval ?? 1,
    recurrenceWeekdays: input.recurrenceWeekdays ?? [],
    recurrenceUntil: input.recurrenceUntil,
    location: input.location,
    projectId: input.projectId ? oid(input.projectId, "projectId") : undefined,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateEvent(
  input: Partial<CreateEventInput> & {
    userId: string;
    workspaceId: string;
    eventId: string;
    status?: EventStatus;
  },
): Promise<EventRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await CalEvent.findOne({
    _id: oid(input.eventId, "eventId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Event not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;
  if (input.startsAt !== undefined) doc.startsAt = input.startsAt;
  if (input.endsAt !== undefined) doc.endsAt = input.endsAt;
  if (input.allDay !== undefined) doc.allDay = input.allDay;
  if (input.recurrence !== undefined) doc.recurrence = input.recurrence;
  if (input.recurrenceInterval !== undefined) doc.recurrenceInterval = input.recurrenceInterval;
  if (input.recurrenceWeekdays !== undefined) doc.recurrenceWeekdays = input.recurrenceWeekdays;
  if (input.recurrenceUntil !== undefined) doc.recurrenceUntil = input.recurrenceUntil;
  if (input.location !== undefined) doc.location = input.location;
  if (input.projectId !== undefined)
    doc.projectId = input.projectId ? oid(input.projectId, "projectId") : undefined;
  if (input.status !== undefined) doc.status = input.status;
  if (doc.endsAt < doc.startsAt) {
    throw new ValidationError({ endsAt: ["Event end must not precede its start."] });
  }
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteEvent(
  userId: string,
  workspaceId: string,
  eventId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await CalEvent.findOne({
    _id: oid(eventId, "eventId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Event not found.");
  assertCanWrite(member, doc.ownerId);
  await doc.deleteOne();
}
