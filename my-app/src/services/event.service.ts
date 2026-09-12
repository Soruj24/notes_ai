import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  updateEvent,
  type CreateEventInput,
  type EventFilters,
  type EventRecord,
} from "@/src/repositories/event.repository";
import type { EventStatus } from "@/src/lib/db/enums";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Event use-cases: repository delegation + activity side-effects. */
export async function listUserEvents(
  userId: string,
  workspaceId: string,
  filters?: EventFilters,
): Promise<EventRecord[]> {
  await requireFlag("calendar", userId);
  return listEvents(userId, workspaceId, filters);
}

export async function getUserEvent(
  userId: string,
  workspaceId: string,
  eventId: string,
): Promise<EventRecord> {
  await requireFlag("calendar", userId);
  return getEvent(userId, workspaceId, eventId);
}

export async function createUserEvent(
  input: CreateEventInput,
): Promise<EventRecord> {
  await requireFlag("calendar", input.userId);
  const event = await createEvent(input);
  publishDomainEvent("event.created", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: event.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "event",
    entityId: event.id,
  });
  return event;
}

export async function updateUserEvent(
  input: Partial<CreateEventInput> & {
    userId: string;
    workspaceId: string;
    eventId: string;
    status?: EventStatus;
  },
): Promise<EventRecord> {
  await requireFlag("calendar", input.userId);
  const event = await updateEvent(input);
  publishDomainEvent("event.updated", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: event.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "event",
    entityId: event.id,
  });
  return event;
}

export async function deleteUserEvent(
  userId: string,
  workspaceId: string,
  eventId: string,
): Promise<void> {
  await requireFlag("calendar", userId);
  await deleteEvent(userId, workspaceId, eventId);
  publishDomainEvent("event.deleted", {
    workspaceId,
    actorId: userId,
    entityId: eventId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "event",
    entityId: eventId,
  });
}
