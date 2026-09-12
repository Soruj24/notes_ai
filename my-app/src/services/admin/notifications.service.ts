import type { PlatformUser } from "@/src/lib/api/admin";
import type {
  AdminNotificationPriority,
  AdminNotificationSeverity,
  AdminNotificationSource,
} from "@/src/lib/db/admin-enums";
import {
  countAdminNotifications,
  listAdminNotificationsFiltered,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
  requireAdminNotification,
} from "@/src/repositories/admin-notification.repository";

/**
 * Staff inbox reads. No audit entries for reads (read state lives on the
 * rows themselves); the console is display plus acknowledgement only —
 * producers write, staff triage.
 */

export interface InboxFilters {
  severity?: AdminNotificationSeverity;
  priority?: AdminNotificationPriority;
  source?: AdminNotificationSource;
  read?: "read" | "unread";
  search?: string;
  limit: number;
  offset: number;
}

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  severity: AdminNotificationSeverity;
  priority: AdminNotificationPriority;
  source: AdminNotificationSource;
  linkHref?: string;
  read: boolean;
  createdAt: string;
}

export async function getInbox(
  staff: PlatformUser,
  filters: InboxFilters,
): Promise<{ items: InboxItem[]; total: number; unread: number }> {
  const base = { ...filters };
  const [rows, total, unread] = await Promise.all([
    listAdminNotificationsFiltered({ ...base, userId: staff.user.id }),
    // userId scopes the read-state filter exactly like the list query.
    countAdminNotifications({ ...base, userId: staff.user.id }),
    countAdminNotifications({ read: "unread", userId: staff.user.id }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      severity: r.severity,
      priority: r.priority,
      source: r.source,
      linkHref: r.linkHref,
      read: r.readBy.includes(staff.user.id),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    unread,
  };
}

export async function markRead(staff: PlatformUser, id: string): Promise<{ id: string }> {
  await requireAdminNotification(id);
  await markAdminNotificationRead(id, staff.user.id);
  return { id };
}

export async function markAllRead(staff: PlatformUser): Promise<{ updated: number }> {
  const updated = await markAllAdminNotificationsRead(staff.user.id);
  return { updated };
}
