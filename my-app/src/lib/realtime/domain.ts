import { randomUUID } from "node:crypto";

/**
 * Domain events: note.*, task.*, event.*, goal.*, project.*,
 * notification.created. Published fire-and-forget from services AFTER
 * the mutation commits — a failed emit never fails the mutation, and
 * subscribers treat events as invalidation hints (refetch for truth),
 * which makes optimistic UI reconcile without conflicts.
 */

export const DOMAIN_EVENTS = [
  "note.created",
  "note.updated",
  "note.deleted",
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "event.created",
  "event.updated",
  "event.deleted",
  "goal.updated",
  "project.updated",
  "notification.created",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[number];

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  workspaceId: string;
  actorId: string;
  entityId?: string;
  at: string;
}

export function publishDomainEvent(
  type: DomainEventType,
  ctx: { workspaceId: string; actorId: string; entityId?: string },
): void {
  if (process.env.SOCKET_ENABLED === "0") return;
  const event: DomainEvent = {
    id: randomUUID(),
    type,
    workspaceId: ctx.workspaceId,
    actorId: ctx.actorId,
    entityId: ctx.entityId,
    at: new Date().toISOString(),
  };
  // Dynamic import keeps service bundles free of the socket client
  // until an event actually fires.
  void import("@/src/lib/realtime/emit")
    .then(({ emitToWorkspace }) =>
      emitToWorkspace(ctx.workspaceId, "domain", event),
    )
    .catch(() => {
      // Polling covers delivery.
    });
}
