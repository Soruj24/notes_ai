import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Note } from "@/src/models/note.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface NoteRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  body?: string;
  tags: string[];
  projectId?: string;
  goalId?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteFilters {
  query?: string;
  tagId?: string;
  projectId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  /** Default false: trash is opt-in only. */
  isDeleted?: boolean;
  limit?: number;
}

export interface NoteCounts {
  all: number;
  favorites: number;
  archived: number;
  trash: number;
}

function toRecord(doc: Record<string, unknown>): NoteRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    title: doc.title as string,
    body: doc.body as string | undefined,
    tags: ((doc.tags ?? []) as unknown[]).map(String),
    projectId: doc.projectId ? String(doc.projectId) : undefined,
    goalId: doc.goalId ? String(doc.goalId) : undefined,
    isPinned: Boolean(doc.isPinned),
    isFavorite: Boolean(doc.isFavorite),
    isArchived: Boolean(doc.isArchived),
    isDeleted: Boolean(doc.isDeleted),
    deletedAt: doc.deletedAt as Date | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listNotes(
  userId: string,
  workspaceId: string,
  filters: NoteFilters = {},
): Promise<NoteRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = {
    workspaceId: member.workspaceId,
    isDeleted: filters.isDeleted ?? false,
  };
  if (filters.query) query.$text = { $search: filters.query };
  if (filters.tagId) query.tags = oid(filters.tagId, "tagId");
  if (filters.projectId) query.projectId = oid(filters.projectId, "projectId");
  if (filters.isPinned !== undefined) query.isPinned = filters.isPinned;
  if (filters.isFavorite !== undefined) query.isFavorite = filters.isFavorite;
  if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;
  const docs = await Note.find(query)
    .sort({ isPinned: -1, updatedAt: -1 })
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function countNotes(
  userId: string,
  workspaceId: string,
): Promise<NoteCounts> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const base = { workspaceId: member.workspaceId };
  const [all, favorites, archived, trash] = await Promise.all([
    Note.countDocuments({ ...base, isDeleted: false, isArchived: false }),
    Note.countDocuments({ ...base, isDeleted: false, isFavorite: true }),
    Note.countDocuments({ ...base, isDeleted: false, isArchived: true }),
    Note.countDocuments({ ...base, isDeleted: true }),
  ]);
  return { all, favorites, archived, trash };
}

export async function getNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const doc = await Note.findOne({
    _id: oid(noteId, "noteId"),
    workspaceId: member.workspaceId,
  }).lean();
  if (!doc) throw new NotFoundError("Note not found.");
  return toRecord(doc as Record<string, unknown>);
}

export async function createNote(input: {
  userId: string;
  workspaceId: string;
  title: string;
  body?: string;
  tagIds?: string[];
  projectId?: string;
  goalId?: string;
}): Promise<NoteRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Note.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    title: input.title,
    body: input.body,
    tags: (input.tagIds ?? []).map((t) => oid(t, "tagId")),
    projectId: input.projectId ? oid(input.projectId, "projectId") : undefined,
    goalId: input.goalId ? oid(input.goalId, "goalId") : undefined,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateNote(input: {
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
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  await db();
  const doc = await Note.findOne({
    _id: oid(input.noteId, "noteId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Note not found.");
  assertCanWrite(member, doc.ownerId);
  if (input.title !== undefined) doc.title = input.title;
  if (input.body !== undefined) doc.body = input.body;
  if (input.tagIds !== undefined)
    doc.tags = input.tagIds.map((t) => oid(t, "tagId"));
  if (input.projectId !== undefined)
    doc.projectId = input.projectId ? oid(input.projectId, "projectId") : undefined;
  if (input.goalId !== undefined)
    doc.goalId = input.goalId ? oid(input.goalId, "goalId") : undefined;
  if (input.isPinned !== undefined) doc.isPinned = input.isPinned;
  if (input.isFavorite !== undefined) doc.isFavorite = input.isFavorite;
  if (input.isArchived !== undefined) doc.isArchived = input.isArchived;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

/** Soft delete: moves the note to trash. */
export async function trashNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Note.findOne({
    _id: oid(noteId, "noteId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Note not found.");
  assertCanWrite(member, doc.ownerId);
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function restoreNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Note.findOne({
    _id: oid(noteId, "noteId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Note not found.");
  assertCanWrite(member, doc.ownerId);
  doc.isDeleted = false;
  doc.deletedAt = undefined;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

/** Permanent delete. Only allowed from trash. */
export async function purgeNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Note.findOne({
    _id: oid(noteId, "noteId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Note not found.");
  assertCanWrite(member, doc.ownerId);
  if (!doc.isDeleted) {
    throw new ForbiddenError("Only trashed notes can be permanently deleted.");
  }
  await doc.deleteOne();
}

/** Back-compat alias: trash by default. */
export async function deleteNote(
  userId: string,
  workspaceId: string,
  noteId: string,
): Promise<NoteRecord> {
  return trashNote(userId, workspaceId, noteId);
}
