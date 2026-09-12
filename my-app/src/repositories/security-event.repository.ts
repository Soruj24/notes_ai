import { SecurityEvent } from "@/src/models/security-event.model";
import { clampLimit, db, oid } from "@/src/repositories/base";
import { sanitizeMetadata } from "@/src/lib/security/sanitize";
import type { SecurityEventType, SecuritySeverity } from "@/src/lib/db/admin-enums";

export interface SecurityEventRecord {
  id: string;
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: SecuritySeverity;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SecurityEventFilters {
  type?: SecurityEventType;
  /** Comma-listed types for multi-section presets (e.g. session activity). */
  types?: SecurityEventType[];
  severity?: SecuritySeverity;
  userId?: string;
  email?: string;
  ipAddress?: string;
  /** Full-text-ish match across type, email, IP. */
  search?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): SecurityEventRecord {
  return {
    id: String(doc._id),
    type: doc.type as SecurityEventType,
    userId: doc.userId ? String(doc.userId) : undefined,
    email: doc.email as string | undefined,
    ipAddress: doc.ipAddress as string | undefined,
    userAgent: doc.userAgent as string | undefined,
    severity: (doc.severity as SecuritySeverity | undefined) ?? "MEDIUM",
    metadata: doc.metadata as Record<string, unknown> | undefined,
    createdAt: doc.createdAt as Date,
  };
}

function escapeRegExp(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuery(filters: SecurityEventFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.type) query.type = filters.type;
  else if (filters.types?.length) query.type = { $in: filters.types };
  if (filters.severity) query.severity = filters.severity;
  if (filters.userId) query.userId = oid(filters.userId, "userId");
  if (filters.email) query.email = filters.email.toLowerCase().trim();
  if (filters.ipAddress) query.ipAddress = filters.ipAddress;
  if (filters.search?.trim()) {
    const rx = new RegExp(escapeRegExp(filters.search.trim()), "i");
    query.$or = [{ type: rx }, { email: rx }, { ipAddress: rx }];
  }
  if (filters.since || filters.until) {
    query.createdAt = {
      ...(filters.since ? { $gte: filters.since } : {}),
      ...(filters.until ? { $lte: filters.until } : {}),
    };
  }
  return query;
}

/**
 * Metadata is sanitized here as a backstop — callers should pass clean
 * data, but secrets can never reach the collection either way.
 */
export async function recordSecurityEvent(input: {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: SecuritySeverity;
  metadata?: Record<string, unknown>;
}): Promise<SecurityEventRecord> {
  await db();
  const doc = await SecurityEvent.create({
    ...input,
    severity: input.severity ?? "MEDIUM",
    metadata: sanitizeMetadata(input.metadata),
  });
  return toRecord(doc.toObject());
}

export async function listSecurityEvents(
  filters: SecurityEventFilters = {},
): Promise<SecurityEventRecord[]> {
  await db();
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const docs = await SecurityEvent.find(buildQuery(filters))
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map(toRecord);
}

export async function countSecurityEvents(filters: SecurityEventFilters = {}): Promise<number> {
  await db();
  return SecurityEvent.countDocuments(buildQuery(filters));
}

export async function getSecurityEvent(id: string): Promise<SecurityEventRecord | null> {
  await db();
  const doc = await SecurityEvent.findById(oid(id, "id")).lean();
  return doc ? toRecord(doc) : null;
}

/** Failed-login count for one identity since a floor (brute-force input). */
export async function countRecentLoginFailures(email: string, since: Date): Promise<number> {
  await db();
  return SecurityEvent.countDocuments({
    type: "login.failed",
    email: email.toLowerCase().trim(),
    createdAt: { $gte: since },
  });
}

export async function distinctSecurityTypes(): Promise<string[]> {
  await db();
  return SecurityEvent.distinct("type").then((rows) =>
    (rows as unknown[]).filter((r): r is string => typeof r === "string").sort(),
  );
}
