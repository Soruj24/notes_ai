import type { ActivityAction, ActivityEntity } from "@/src/lib/db/enums";
import { ActivityLog } from "@/src/models/activity-log.model";
import {
  clampLimit,
  db,
  oid,
  requireMembership,
} from "@/src/repositories/base";

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export async function recordActivity(input: {
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await requireMembership(input.actorId, input.workspaceId);
  await db();
  await ActivityLog.create({
    workspaceId: oid(input.workspaceId, "workspaceId"),
    actorId: oid(input.actorId, "actorId"),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ? oid(input.entityId, "entityId") : undefined,
    metadata: input.metadata,
  });
}

function toActivityRecord(d: {
  _id: unknown;
  workspaceId: unknown;
  actorId: unknown;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: unknown;
  metadata?: unknown;
  createdAt: Date;
}): ActivityRecord {
  return {
    id: String(d._id),
    workspaceId: String(d.workspaceId),
    actorId: String(d.actorId),
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId ? String(d.entityId) : undefined,
    metadata: d.metadata as Record<string, unknown> | undefined,
    createdAt: d.createdAt,
  };
}

/**
 * Admin-only cross-workspace actor timeline. Bypasses membership gating
 * by design — callers must hold users.view (staff inspect, never user paths).
 */
export async function listActivityByActor(actorId: string, limit?: number): Promise<ActivityRecord[]> {
  await db();
  const docs = await ActivityLog.find({ actorId: oid(actorId, "actorId") })
    .sort({ createdAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) =>
    toActivityRecord({
      _id: d._id,
      workspaceId: d.workspaceId,
      actorId: d.actorId,
      action: d.action,
      entityType: d.entityType,
      entityId: d.entityId,
      metadata: d.metadata,
      createdAt: d.createdAt,
    }),
  );
}

export async function listActivity(
  userId: string,
  workspaceId: string,
  limit?: number,
): Promise<ActivityRecord[]> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const docs = await ActivityLog.find({ workspaceId: member.workspaceId })
    .sort({ createdAt: -1 })
    .limit(clampLimit(limit))
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    workspaceId: String(d.workspaceId),
    actorId: String(d.actorId),
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId ? String(d.entityId) : undefined,
    metadata: d.metadata as Record<string, unknown> | undefined,
    createdAt: d.createdAt,
  }));
}
