import type {
  AdminNotificationPriority,
  AdminNotificationSeverity,
  AdminNotificationSource,
} from "@/src/lib/db/admin-enums";
import {
  createAdminNotification,
  hasRecentNotificationByTitle,
  type AdminNotificationRecord,
} from "@/src/repositories/admin-notification.repository";

/**
 * Staff inbox fan-out. Producers describe the event (identifiers only —
 * never credentials, tokens, or metadata blobs); this module persists,
 * deduplicates noisy repeaters, and pushes a live event to open consoles.
 * Fire-and-forget from request paths: notification failures never fail
 * the originating request.
 */

export interface NotifyAdminInput {
  title: string;
  body: string;
  severity?: AdminNotificationSeverity;
  priority?: AdminNotificationPriority;
  source: AdminNotificationSource;
  linkHref?: string;
  targetRole?: string;
  /** Skip creation when the same title fired inside this window. */
  dedupeMin?: number;
}

export async function notifyAdmin(input: NotifyAdminInput): Promise<AdminNotificationRecord | null> {
  try {
    if (input.dedupeMin && input.dedupeMin > 0) {
      const since = new Date(Date.now() - input.dedupeMin * 60 * 1000);
      if (await hasRecentNotificationByTitle(input.title, since)) return null;
    }
    const record = await createAdminNotification({
      title: input.title.slice(0, 200),
      body: input.body.slice(0, 2000),
      severity: input.severity ?? "info",
      priority: input.priority ?? "normal",
      source: input.source,
      targetRole: input.targetRole,
      linkHref: input.linkHref,
    });
    const { emitToAdmins } = await import("@/src/lib/realtime/emit");
    emitToAdmins("admin-notification", { id: record.id });
    return record;
  } catch {
    return null;
  }
}
