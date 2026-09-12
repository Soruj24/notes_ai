import {
  countNotes,
  createNote,
  deleteNote,
  getNote,
  listNotes,
  purgeNote,
  restoreNote,
  trashNote,
  updateNote,
  type NoteCounts,
  type NoteFilters,
  type NoteRecord,
} from "@/src/repositories/note.repository";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Note use-cases: repository delegation + activity side-effects. */
export async function listUserNotes(
  userId: string,
  workspaceId: string,
  filters?: NoteFilters,
): Promise<NoteRecord[]> {
  await requireFlag("notes", userId);
  return listNotes(userId, workspaceId, filters);
}

export async function getUserNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  await requireFlag("notes", userId);
  return getNote(userId, workspaceId, noteId);
}

export async function createUserNote(input: {
  userId: string;
  workspaceId: string;
  title: string;
  body?: string;
  tagIds?: string[];
  projectId?: string;
  goalId?: string;
}): Promise<NoteRecord> {
  await requireFlag("notes", input.userId);
  const note = await createNote(input);
  publishDomainEvent("note.created", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: note.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "note",
    entityId: note.id,
  });
  return note;
}

export async function countUserNotes(
  userId: string,
  workspaceId: string,
): Promise<NoteCounts> {
  await requireFlag("notes", userId);
  return countNotes(userId, workspaceId);
}

export async function updateUserNote(input: {
  userId: string;
  workspaceId: string;
  noteId: string;
  title?: string;
  body?: string;
  tagIds?: string[];
  projectId?: string | null;
  goalId?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
}): Promise<NoteRecord> {
  await requireFlag("notes", input.userId);
  const note = await updateNote(input);
  publishDomainEvent("note.updated", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: note.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "note",
    entityId: note.id,
  });
  return note;
}

export async function deleteUserNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  await requireFlag("notes", userId);
  const note = await deleteNote(userId, workspaceId, noteId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "notes", noteId);
  publishDomainEvent("note.deleted", {
    workspaceId,
    actorId: userId,
    entityId: noteId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "note",
    entityId: noteId,
  });
  return note;
}

export async function trashUserNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  await requireFlag("notes", userId);
  const note = await trashNote(userId, workspaceId, noteId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "notes", noteId);
  publishDomainEvent("note.deleted", {
    workspaceId,
    actorId: userId,
    entityId: noteId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "note",
    entityId: noteId,
  });
  return note;
}

export async function restoreUserNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  await requireFlag("notes", userId);
  const note = await restoreNote(userId, workspaceId, noteId);
  const { indexEntity } = await import("@/src/services/semantic.service");
  await indexEntity(userId, workspaceId, "notes", noteId);
  publishDomainEvent("note.updated", {
    workspaceId,
    actorId: userId,
    entityId: noteId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "reopened",
    entityType: "note",
    entityId: noteId,
  });
  return note;
}

export async function purgeUserNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<void> {
  await requireFlag("notes", userId);
  await purgeNote(userId, workspaceId, noteId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "notes", noteId);
  publishDomainEvent("note.deleted", {
    workspaceId,
    actorId: userId,
    entityId: noteId,
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "note",
    entityId: noteId,
  });
}
