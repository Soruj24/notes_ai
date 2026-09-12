import type { AiConversationStatus, AiRole } from "@/src/lib/db/enums";
import { ForbiddenError, NotFoundError } from "@/src/lib/db/errors";
import { AiConversation } from "@/src/models/ai-conversation.model";
import { AiMessage } from "@/src/models/ai-message.model";
import {
  assertCanWrite,
  clampLimit,
  db,
  oid,
  requireMembership,
  requireWritableMembership,
} from "@/src/repositories/base";

export interface ConversationRecord {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  model?: string;
  status: AiConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  toolName?: string;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

function toConversation(doc: Record<string, unknown>): ConversationRecord {
  return {
    id: String(doc.id ?? doc._id),
    workspaceId: String(doc.workspaceId),
    userId: String(doc.userId),
    title: doc.title as string,
    model: doc.model as string | undefined,
    status: doc.status as AiConversationStatus,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

function toMessage(doc: Record<string, unknown>): MessageRecord {
  return {
    id: String(doc.id ?? doc._id),
    conversationId: String(doc.conversationId),
    role: doc.role as AiRole,
    content: doc.content as string,
    toolName: doc.toolName as string | undefined,
    inputTokens: doc.inputTokens as number | undefined,
    outputTokens: doc.outputTokens as number | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listConversations(
  userId: string,
  workspaceId: string,
  limit?: number,
): Promise<ConversationRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const docs = await AiConversation.find({
    workspaceId: member.workspaceId,
    userId: member.userId,
  })
    .sort({ updatedAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => toConversation(d as Record<string, unknown>));
}

export async function createConversation(input: {
  userId: string;
  workspaceId: string;
  title: string;
  model?: string;
}): Promise<ConversationRecord> {
  const member = await requireWritableMembership(input.userId, input.workspaceId);
  if (member.role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify content.");
  }
  await db();
  const doc = await AiConversation.create({
    workspaceId: member.workspaceId,
    userId: member.userId,
    title: input.title,
    model: input.model,
  });
  return toConversation(doc.toObject() as Record<string, unknown>);
}

async function getOwnedConversation(
  userId: string,
  workspaceId: string,
  conversationId: string,
  mode: "read" | "write" = "read",
) {
  const member =
    mode === "write"
      ? await requireWritableMembership(userId, workspaceId)
      : await requireMembership(userId, workspaceId);
  await db();
  const doc = await AiConversation.findOne({
    _id: oid(conversationId, "conversationId"),
    workspaceId: member.workspaceId,
  });
  if (!doc) throw new NotFoundError("Conversation not found.");
  assertCanWrite(member, doc.userId);
  return { member, doc };
}

export async function getConversation(
  userId: string,
  workspaceId: string,
  conversationId: string,
): Promise<ConversationRecord> {
  const { doc } = await getOwnedConversation(userId, workspaceId, conversationId);
  return toConversation(doc.toObject() as Record<string, unknown>);
}

export async function archiveConversation(
  userId: string,
  workspaceId: string,
  conversationId: string,
): Promise<ConversationRecord> {
  const { doc } = await getOwnedConversation(userId, workspaceId, conversationId, "write");
  doc.status = "archived";
  await doc.save();
  return toConversation(doc.toObject() as Record<string, unknown>);
}

export async function appendMessage(input: {
  userId: string;
  workspaceId: string;
  conversationId: string;
  role: AiRole;
  content: string;
  toolName?: string;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<MessageRecord> {
  const { doc } = await getOwnedConversation(
    input.userId,
    input.workspaceId,
    input.conversationId,
    "write",
  );
  const msg = await AiMessage.create({
    conversationId: doc._id,
    role: input.role,
    content: input.content,
    toolName: input.toolName,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  });
  doc.updatedAt = new Date();
  await doc.save();
  return toMessage(msg.toObject() as Record<string, unknown>);
}

export interface DailyUsage {
  messages: number;
  tokens: number;
}

/** Messages + tokens a user accumulated since `since` (limit enforcement). */
export async function getUserDailyUsage(userId: string, since: Date): Promise<DailyUsage> {
  await db();
  const conversations = await AiConversation.find({ userId: oid(userId, "userId") })
    .select({ _id: 1 })
    .lean();
  if (!conversations.length) return { messages: 0, tokens: 0 };
  const rows = (await AiMessage.aggregate([
    {
      $match: {
        conversationId: { $in: conversations.map((c) => c._id) },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        messages: { $sum: 1 },
        tokens: {
          $sum: { $add: [{ $ifNull: ["$inputTokens", 0] }, { $ifNull: ["$outputTokens", 0] }] },
        },
      },
    },
  ])) as Array<{ _id: null; messages: number; tokens: number }>;
  const total = rows[0];
  return { messages: total?.messages ?? 0, tokens: total?.tokens ?? 0 };
}

export async function listMessages(
  userId: string,
  workspaceId: string,
  conversationId: string,
  limit = 100,
): Promise<MessageRecord[]> {
  const { doc } = await getOwnedConversation(userId, workspaceId, conversationId);
  const docs = await AiMessage.find({ conversationId: doc._id })
    .sort({ createdAt: 1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => toMessage(d as Record<string, unknown>));
}
