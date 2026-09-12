import { Session } from "@/src/models/session.model";
import { db, oid } from "@/src/repositories/base";

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}

export async function createSessionRecord(input: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}): Promise<SessionRecord> {
  await db();
  await Session.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  const doc = await Session.create({
    tokenHash: input.tokenHash,
    userId: oid(input.userId, "userId"),
    expiresAt: input.expiresAt,
  });
  const obj = doc.toObject();
  return { id: String(obj._id), userId: String(obj.userId), expiresAt: obj.expiresAt };
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<SessionRecord | null> {
  await db();
  const doc = await Session.findOne({ tokenHash }).lean();
  if (!doc) return null;
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    expiresAt: doc.expiresAt,
  };
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await db();
  await Session.deleteOne({ tokenHash });
}

export async function deleteSessionsForUser(userId: string): Promise<number> {
  await db();
  const res = await Session.deleteMany({ userId: oid(userId, "userId") });
  return res.deletedCount ?? 0;
}

/** Non-expired session rows (console session-activity metric). */
export async function countActiveSessions(): Promise<number> {
  await db();
  return Session.countDocuments({ expiresAt: { $gt: new Date() } });
}

export interface SessionSummary {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Admin-only session listing. Never exposes token hashes — ids plus
 * timestamps are enough for staff to spot stale devices and revoke.
 */
export async function listSessionsForUser(userId: string): Promise<SessionSummary[]> {
  await db();
  const docs = await Session.find({ userId: oid(userId, "userId") })
    .sort({ createdAt: -1 })
    .select({ createdAt: 1, expiresAt: 1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    createdAt: d.createdAt,
    expiresAt: d.expiresAt,
  }));
}
