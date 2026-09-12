import { ConflictError, ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { isUniqueViolation } from "@/src/lib/db/errors";
import { Tag } from "@/src/models/tag.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface TagRecord {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): TagRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    name: doc.name as string,
    color: doc.color as string | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listTags(
  userId: string,
  workspaceId: string,
  limit?: number,
): Promise<TagRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const docs = await Tag.find({ workspaceId: member.workspaceId })
    .sort({ name: 1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

/** Find by name or create it (idempotent tagging flow). */
export async function getOrCreateTag(
  userId: string,
  workspaceId: string,
  name: string,
): Promise<TagRecord> {
  const member = await requireMembership(userId, workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const normalized = name.trim().toLowerCase();
  const existing = await Tag.findOne({
    workspaceId: member.workspaceId,
    name: normalized,
  }).lean();
  if (existing) return toRecord(existing as Record<string, unknown>);
  try {
    const doc = await Tag.create({
      workspaceId: member.workspaceId,
      name: normalized,
    });
    return toRecord(doc.toObject() as Record<string, unknown>);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      const raced = await Tag.findOne({
        workspaceId: member.workspaceId,
        name: normalized,
      }).lean();
      if (raced) return toRecord(raced as Record<string, unknown>);
      throw new ConflictError("Tag already exists.");
    }
    throw err;
  }
}

export async function renameTag(
  userId: string,
  workspaceId: string,
  tagId: string,
  input: { name?: string; color?: string },
): Promise<TagRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await Tag.findOne({
    _id: oid(tagId, "tagId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Tag not found.");
  if (input.name !== undefined) doc.name = input.name.trim().toLowerCase();
  if (input.color !== undefined) doc.color = input.color;
  try {
    await doc.save();
  } catch (err: unknown) {
    if (isUniqueViolation(err)) throw new ConflictError("Tag already exists.");
    throw err;
  }
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteTag(
  userId: string,
  workspaceId: string,
  tagId: string,
): Promise<void> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Tag.findOne({
    _id: oid(tagId, "tagId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Tag not found.");
  assertCanWrite(member, member.userId);
  await doc.deleteOne();
}
