import type { ActivityAction, ActivityEntity } from "@/src/lib/db/enums";
import { recordActivity } from "@/src/repositories/activity-log.repository";

/**
 * Best-effort activity logging for services. Logging must never fail
 * the underlying mutation, so errors are swallowed here by design.
 */
export async function logActivity(input: {
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await recordActivity(input);
  } catch {
    // Activity log is auxiliary; ignore write failures.
  }
}
