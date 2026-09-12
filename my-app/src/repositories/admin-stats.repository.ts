import { ActivityLog } from "@/src/models/activity-log.model";
import { AiConversation } from "@/src/models/ai-conversation.model";
import { AiMessage } from "@/src/models/ai-message.model";
import { Note } from "@/src/models/note.model";
import { SecurityEvent } from "@/src/models/security-event.model";
import { Task } from "@/src/models/task.model";
import { CalEvent } from "@/src/models/event.model";
import { User } from "@/src/models/user.model";
import { db } from "@/src/repositories/base";

/**
 * Platform-wide read aggregations for the admin console. All queries are
 * bounded ($match on indexed dates → $group by day); raw documents are
 * never loaded — only per-day counts, token sums, and id sets. Every
 * admin service reads through here instead of touching models directly.
 */

interface CountRow {
  _id: string;
  n: number;
}

interface UserSetRow {
  _id: string;
  users: unknown[];
}

interface TokenRow {
  _id: string;
  tokens: number;
}

interface TokenTotal {
  messages: number;
  input: number;
  output: number;
}

function dayMatch(dateField: string, since?: Date, until?: Date): Record<string, unknown> {
  if (!since && !until) return {};
  return {
    [dateField]: {
      ...(since ? { $gte: since } : {}),
      ...(until ? { $lte: until } : {}),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCollection = { aggregate: (pipeline: any[]) => Promise<any[]>; countDocuments: (filter?: any) => Promise<number> };

async function perDay(
  collection: AnyCollection,
  dateField: string,
  since: Date,
  until: Date,
  extra: Record<string, unknown> = {},
): Promise<Map<string, number>> {
  await db();
  const rows = (await collection.aggregate([
    { $match: { [dateField]: { $gte: since, $lte: until }, ...extra } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } }, n: { $sum: 1 } } },
  ])) as CountRow[];
  return new Map(rows.map((r) => [r._id, r.n]));
}

async function perDayTokens(since: Date, until: Date): Promise<Map<string, number>> {
  await db();
  const rows = (await AiMessage.aggregate([
    { $match: { createdAt: { $gte: since, $lte: until } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        tokens: {
          $sum: { $add: [{ $ifNull: ["$inputTokens", 0] }, { $ifNull: ["$outputTokens", 0] }] },
        },
      },
    },
  ])) as TokenRow[];
  return new Map(rows.map((r) => [r._id, r.tokens]));
}

// --- All-time counts -------------------------------------------------------

export async function countAllNotes(): Promise<number> {
  await db();
  return Note.countDocuments({});
}

export async function countAllTasks(): Promise<number> {
  await db();
  return Task.countDocuments({});
}

export async function countDoneTasks(): Promise<number> {
  await db();
  return Task.countDocuments({ status: "done" });
}

export async function countAllAiMessages(): Promise<number> {
  await db();
  return AiMessage.countDocuments({});
}

export async function countAllAiConversations(): Promise<number> {
  await db();
  return AiConversation.countDocuments({});
}

// --- Per-day volume (inclusive window) -------------------------------------

export const usersPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(User, "createdAt", since, until);

export const notesPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(Note, "createdAt", since, until);

export const tasksPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(Task, "createdAt", since, until);

export const tasksCompletedPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(Task, "completedAt", since, until, { status: "done" });

export const eventsPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(CalEvent, "createdAt", since, until);

export const activityPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(ActivityLog, "createdAt", since, until);

export const aiMessagesPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(AiMessage, "createdAt", since, until);

export const aiTokensPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDayTokens(since, until);

export const rateLimitedPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(SecurityEvent, "createdAt", since, until, { type: "rate.limited" });

export const failedRunsPerDay = (since: Date, until: Date): Promise<Map<string, number>> =>
  perDay(AiMessage, "createdAt", since, until, { role: "assistant", content: "(no response)" });

// --- Token totals ----------------------------------------------------------

export async function aiTokenTotals(since?: Date, until?: Date): Promise<TokenTotal> {
  await db();
  const rows = (await AiMessage.aggregate([
    ...(since || until ? [{ $match: dayMatch("createdAt", since, until) }] : []),
    {
      $group: {
        _id: null,
        messages: { $sum: 1 },
        input: { $sum: { $ifNull: ["$inputTokens", 0] } },
        output: { $sum: { $ifNull: ["$outputTokens", 0] } },
      },
    },
  ])) as Array<{ _id: null; messages: number; input: number; output: number }>;
  const total = rows[0];
  return { messages: total?.messages ?? 0, input: total?.input ?? 0, output: total?.output ?? 0 };
}

export async function aiConversationCount(since?: Date, until?: Date): Promise<number> {
  await db();
  return AiConversation.countDocuments(dayMatch("createdAt", since, until));
}

// --- Active-user sets (distinct ids per day; union in callers) -------------

export type ActiveSource = "activity" | "login" | "ai";

const SOURCE_SPEC: Record<ActiveSource, { dateField: string; idField: string; extra?: Record<string, unknown> }> = {
  activity: { dateField: "createdAt", idField: "actorId" },
  login: { dateField: "createdAt", idField: "userId", extra: { type: "login.succeeded" } },
  ai: { dateField: "updatedAt", idField: "userId" },
};

function sourceCollection(source: ActiveSource): AnyCollection {
  switch (source) {
    case "activity":
      return ActivityLog;
    case "login":
      return SecurityEvent;
    case "ai":
      return AiConversation;
  }
}

export async function activeUsersPerDay(
  source: ActiveSource,
  since: Date,
  until: Date,
): Promise<Map<string, Set<string>>> {
  await db();
  const spec = SOURCE_SPEC[source];
  const rows = (await sourceCollection(source).aggregate([
    { $match: { [spec.dateField]: { $gte: since, $lte: until }, ...(spec.extra ?? {}) } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: `$${spec.dateField}` } },
        users: { $addToSet: `$${spec.idField}` },
      },
    },
  ])) as UserSetRow[];
  const out = new Map<string, Set<string>>();
  for (const r of rows) out.set(r._id, new Set(r.users.map(String)));
  return out;
}

/** Distinct users active across all three sources since a floor date. */
export async function distinctActiveUsers(since: Date): Promise<number> {
  await db();
  const union = new Set<string>();
  await Promise.all(
    (Object.keys(SOURCE_SPEC) as ActiveSource[]).map(async (source) => {
      const spec = SOURCE_SPEC[source];
      const rows = (await sourceCollection(source).aggregate([
        { $match: { [spec.dateField]: { $gte: since }, ...(spec.extra ?? {}) } },
        { $group: { _id: null, users: { $addToSet: `$${spec.idField}` } } },
      ])) as Array<{ _id: null; users: unknown[] }>;
      for (const id of rows[0]?.users ?? []) union.add(String(id));
    }),
  );
  return union.size;
}

// --- Feature usage (activity grouped by entity) ----------------------------

export async function activityByEntity(
  since: Date,
  until: Date,
  limit = 8,
): Promise<Array<{ entity: string; uses: number }>> {
  await db();
  const rows = (await ActivityLog.aggregate([
    { $match: { createdAt: { $gte: since, $lte: until } } },
    { $group: { _id: "$entityType", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: Math.min(Math.max(limit, 1), 25) },
  ])) as CountRow[];
  return rows.map((r) => ({ entity: String(r._id), uses: r.n }));
}

// --- Conversations by model --------------------------------------------------

export async function aiConversationsByModel(limit = 8): Promise<Array<{ model: string; conversations: number }>> {
  await db();
  const n = Math.min(Math.max(Math.floor(limit) || 8, 1), 25);
  const rows = (await AiConversation.aggregate([
    { $group: { _id: { $ifNull: ["$model", "unknown"] }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: n },
  ])) as Array<{ _id: string; n: number }>;
  return rows.map((r) => ({ model: r._id, conversations: r.n }));
}

// --- Recent users (inspect lists, bounded) ----------------------------------

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}

export async function recentUsers(limit = 8): Promise<RecentUser[]> {
  await db();
  const n = Math.min(Math.max(Math.floor(limit) || 8, 1), 25);
  const docs = await User.find({})
    .sort({ createdAt: -1 })
    .limit(n)
    .select({ name: 1, email: 1, status: 1, createdAt: 1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name as string,
    email: d.email as string,
    status: (d.status as string | undefined) ?? "ACTIVE",
    createdAt: d.createdAt as Date,
  }));
}

// --- Failed runs (empty assistant responses) --------------------------------

export interface FailedRun {
  conversationId: string;
  at: Date;
}

export async function failedRuns(limit = 10): Promise<FailedRun[]> {
  await db();
  const n = Math.min(Math.max(Math.floor(limit) || 10, 1), 50);
  const docs = await AiMessage.find({ role: "assistant", content: "(no response)" })
    .sort({ createdAt: -1 })
    .limit(n)
    .select({ conversationId: 1, createdAt: 1 })
    .lean();
  return docs.map((d) => ({
    conversationId: String(d.conversationId),
    at: d.createdAt as Date,
  }));
}

export async function failedRunsCount(): Promise<number> {
  await db();
  return AiMessage.countDocuments({ role: "assistant", content: "(no response)" });
}

export async function aiConversationsByIds(
  ids: string[],
): Promise<Array<{ id: string; title: string; model?: string }>> {
  await db();
  if (!ids.length) return [];
  const { Types } = await import("mongoose");
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const docs = await AiConversation.find({ _id: { $in: objectIds } })
    .select({ title: 1, model: 1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    title: d.title as string,
    model: d.model as string | undefined,
  }));
}
