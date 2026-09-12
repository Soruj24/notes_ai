import { PageHeader } from "@/src/components/admin/PageHeader";
import { NotificationsManager } from "@/src/components/admin/notifications/NotificationsManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Staff inbox: registrations, threats, failures, changes — live. */
export default async function AdminNotificationsPage() {
  await requirePagePermission("notifications.view", "/admin/notifications");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Notifications"
        description="Registrations, suspicious activity, AI failures, system errors, feature and maintenance events. Bodies carry identifiers only — never secrets."
      />
      <NotificationsManager />
    </div>
  );
}
