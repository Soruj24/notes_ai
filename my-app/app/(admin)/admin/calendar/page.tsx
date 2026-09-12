import { PageHeader } from "@/src/components/admin/PageHeader";
import { ModerationManager } from "@/src/components/admin/moderation/ModerationManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace event inspection + moderation (cancel / restore / delete). */
export default async function AdminCalendarPage() {
  const staff = await requirePagePermission("calendar.view", "/admin/calendar");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Content"
        title="Calendar"
        description="Inspect events across workspaces. Cancelling stops reminders; deletion is permanent and audited."
      />
      <ModerationManager entity="events" role={staff.role} />
    </div>
  );
}
