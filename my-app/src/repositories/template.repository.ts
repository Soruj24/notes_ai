import type { TemplateKind } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { Template } from "@/src/models/template.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership, requireWritableMembership,
} from "@/src/repositories/base";

export interface TemplateRecord {
  id: string;
  workspaceId?: string;
  ownerId: string;
  kind: TemplateKind;
  title: string;
  payload: Record<string, unknown>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(doc: Record<string, unknown>): TemplateRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: doc.workspaceId ? String(doc.workspaceId) : undefined,
    ownerId: String(doc.ownerId),
    kind: doc.kind as TemplateKind,
    title: doc.title as string,
    payload: (doc.payload ?? {}) as Record<string, unknown>,
    isPublic: Boolean(doc.isPublic),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listTemplates(
  userId: string,
  workspaceId: string,
  kind?: TemplateKind,
  limit?: number,
): Promise<TemplateRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const query: Record<string, unknown> = {
    $or: [{ workspaceId: member.workspaceId }, { isPublic: true }],
  };
  if (kind) query.kind = kind;
  const docs = await Template.find(query)
    .sort({ updatedAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => toRecord(d as Record<string, unknown>));
}

export async function createTemplate(input: {
  userId: string;
  workspaceId?: string;
  kind: TemplateKind;
  title: string;
  payload: Record<string, unknown>;
  isPublic?: boolean;
}): Promise<TemplateRecord> {
  if (input.workspaceId) {
    const member = await requireWritableMembership(input.userId, input.workspaceId);
    if (member.role === "viewer") {
      throw new ForbiddenError("Viewers cannot modify content.");
    }
  }
  await db();
  const doc = await Template.create({
    workspaceId: input.workspaceId ? oid(input.workspaceId, "workspaceId") : undefined,
    ownerId: oid(input.userId, "userId"),
    kind: input.kind,
    title: input.title,
    payload: input.payload,
    isPublic: input.isPublic ?? false,
  });
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function updateTemplate(input: {
  userId: string;
  templateId: string;
  title?: string;
  payload?: Record<string, unknown>;
  isPublic?: boolean;
}): Promise<TemplateRecord> {
  await db();
  const doc = await Template.findById(oid(input.templateId, "templateId"));
  if (!doc) throw new NotFoundError("Template not found.");
  if (doc.workspaceId) {
    const member = await requireWritableMembership(input.userId, String(doc.workspaceId));
    assertCanWrite(member, doc.ownerId);
  } else if (String(doc.ownerId) !== input.userId) {
    throw new ForbiddenError("Only the owner can modify this.");
  }
  if (input.title !== undefined) doc.title = input.title;
  if (input.payload !== undefined) doc.payload = input.payload;
  if (input.isPublic !== undefined) doc.isPublic = input.isPublic;
  await doc.save();
  return toRecord(doc.toObject() as Record<string, unknown>);
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await db();
  const doc = await Template.findById(oid(templateId, "templateId"));
  if (!doc) throw new NotFoundError("Template not found.");
  if (doc.workspaceId) {
    const member = await requireWritableMembership(userId, String(doc.workspaceId));
    assertCanWrite(member, doc.ownerId);
  } else if (String(doc.ownerId) !== userId) {
    throw new ForbiddenError("Only the owner can modify this.");
  }
  await doc.deleteOne();
}
