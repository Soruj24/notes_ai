import { AdminAuditLog, type AuditResult } from "@/src/models/admin-audit-log.model";
import { clampLimit, db, oid } from "@/src/repositories/base";

/**
 * Append-only platform audit trail. This module exposes create + list
 * only — update/delete functions must never be added here (the schema
 * additionally rejects all mutation operations at the model layer).
 */

export interface AuditRecord {
  id: string;
  actorId: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  workspaceId?: string;
  /** Redacted by readers before responding — may contain PII snapshots. */
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result: AuditResult;
  timestamp: Date;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  /** Full-text-ish match across action, resourceType, resourceId, IP. */
  search?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): AuditRecord {
  return {
    id: String(doc._id),
    actorId: String(doc.actorId),
    actorRole: doc.actorRole as string | undefined,
    action: doc.action as string,
    resourceType: doc.resourceType as string | undefined,
    resourceId: doc.resourceId as string | undefined,
    workspaceId: doc.workspaceId ? String(doc.workspaceId) : undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    ipAddress: doc.ipAddress as string | undefined,
    userAgent: doc.userAgent as string | undefined,
    result: (doc.result as AuditResult | undefined) ?? "success",
    timestamp: doc.timestamp as Date,
  };
}

function escapeRegExp(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuery(filters: AuditFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.actorId) query.actorId = oid(filters.actorId, "actorId");
  if (filters.action) query.action = filters.action;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.result === "denied") {
    query.result = "denied";
  } else if (filters.result === "success") {
    // Pre-result rows (written before the field existed) were all successes.
    query.result = { $ne: "denied" };
  }
  if (filters.search?.trim()) {
    const rx = new RegExp(escapeRegExp(filters.search.trim()), "i");
    query.$or = [{ action: rx }, { resourceType: rx }, { resourceId: rx }, { ipAddress: rx }];
  }
  if (filters.since || filters.until) {
    query.timestamp = {
      ...(filters.since ? { $gte: filters.since } : {}),
      ...(filters.until ? { $lte: filters.until } : {}),
    };
  }
  return query;
}

export async function recordAuditEvent(input: {
  actorId: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result?: AuditResult;
}): Promise<AuditRecord> {
  await db();
  const doc = await AdminAuditLog.create({ ...input, timestamp: new Date() });
  return toRecord(doc.toObject());
}

export async function countAuditEvents(filters: AuditFilters = {}): Promise<number> {
  await db();
  return AdminAuditLog.countDocuments(buildQuery(filters));
}

export async function listAuditEvents(filters: AuditFilters = {}): Promise<AuditRecord[]> {
  await db();
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const docs = await AdminAuditLog.find(buildQuery(filters))
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(clampLimit(filters.limit))
    .lean();
  return docs.map(toRecord);
}

/** Single entry for the inspect drawer (metadata included). */
export async function getAuditEvent(id: string): Promise<AuditRecord | null> {
  await db();
  const doc = await AdminAuditLog.findById(oid(id, "id")).lean();
  return doc ? toRecord(doc) : null;
}

export async function distinctAuditActions(): Promise<string[]> {
  await db();
  return AdminAuditLog.distinct("action").then((rows) =>
    (rows as unknown[]).filter((r): r is string => typeof r === "string").sort(),
  );
}

export async function distinctAuditResourceTypes(): Promise<string[]> {
  await db();
  return AdminAuditLog.distinct("resourceType").then((rows) =>
    (rows as unknown[])
      .filter((r): r is string => typeof r === "string" && r.length > 0)
      .sort(),
  );
}

export async function distinctAuditActors(): Promise<Array<{ id: string; lastRole?: string }>> {
  await db();
  const rows = (await AdminAuditLog.aggregate([
    { $group: { _id: "$actorId", lastRole: { $last: "$actorRole" }, lastSeen: { $max: "$timestamp" } } },
    { $sort: { lastSeen: -1 } },
    { $limit: 200 },
  ])) as Array<{ _id: unknown; lastRole?: string }>;
  return rows.map((r) => ({ id: String(r._id), lastRole: r.lastRole }));
}
