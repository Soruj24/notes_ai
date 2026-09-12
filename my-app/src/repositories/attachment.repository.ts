import type { AttachmentEntity } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Attachment } from "@/src/models/attachment.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface AttachmentRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  filename: string;
  mime: string;
  size: number;
  storageKey: string;
  url?: string;
  entityType: AttachmentEntity;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): AttachmentRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    ownerId: String(doc.ownerId),
    filename: doc.filename as string,
    mime: doc.mime as string,
    size: Number(doc.size),
    storageKey: doc.storageKey as string,
    url: doc.url as string | undefined,
    entityType: doc.entityType as AttachmentEntity,
    entityId: doc.entityId ? String(doc.entityId) : undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listAttachments(
  userId: string,
  workspaceId: string,
  entityId?: string,
  limit?: number,
): Promise<AttachmentRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = { workspaceId: member.workspaceId };
  if (entityId) query.entityId = oid(entityId, "entityId");
  const docs = await Attachment.find(query)
    .sort({ createdAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function createAttachmentMetadata(input: {
  userId: string;
  workspaceId: string;
  filename: string;
  mime: string;
  size: number;
  storageKey: string;
  url?: string;
  entityType?: AttachmentEntity;
  entityId?: string;
}): Promise<AttachmentRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const [maxMb, quotaMb] = await Promise.all([
    getSettingValue("storage.maxAttachmentMb", 25),
    getSettingValue("storage.workspaceQuotaMb", 0),
  ]);
  if (input.size > maxMb * 1024 * 1024) {
    throw new ForbiddenError(`Attachments are limited to ${maxMb} MB.`);
  }
  if (quotaMb > 0) {
    const used = await Attachment.aggregate([
      { $match: { workspaceId: member.workspaceId } },
      { $group: { _id: null, bytes: { $sum: "$size" } } },
    ]);
    const usedBytes = (used[0]?.bytes ?? 0) as number;
    if (usedBytes + input.size > quotaMb * 1024 * 1024) {
      throw new ForbiddenError("Workspace storage quota reached.");
    }
  }
  const doc = await Attachment.create({
    workspaceId: member.workspaceId,
    ownerId: member.userId,
    filename: input.filename,
    mime: input.mime,
    size: input.size,
    storageKey: input.storageKey,
    url: input.url,
    entityType: input.entityType ?? "other",
    entityId: input.entityId ? oid(input.entityId, "entityId") : undefined,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteAttachment(
  userId: string,
  workspaceId: string,
  attachmentId: string,
): Promise<AttachmentRecord> {
  const member = await requireWritableMembership(userId, workspaceId);
  await db();
  const doc = await Attachment.findOne({
    _id: oid(attachmentId, "attachmentId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Attachment not found.");
  assertCanWrite(member, doc.ownerId);
  const record = toRecord(doc.toObject() as Record<string, unknown>);
  await doc.deleteOne();
  return record;
}
