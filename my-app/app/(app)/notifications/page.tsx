import type { Metadata } from "next";
import { NotificationList } from "@/src/components/notifications/NotificationList";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Notifications" };

/** Full notification history. The bell + drawer cover day-to-day triage. */
export default async function NotificationsPage() {
  const { workspace } = await requireWorkspace("/notifications");
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
      <NotificationList wid={workspace.id} />
    </div>
  );
}
