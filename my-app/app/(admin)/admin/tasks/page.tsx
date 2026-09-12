import { PageHeader } from "@/src/components/admin/PageHeader";
import { ModerationManager } from "@/src/components/admin/moderation/ModerationManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace task inspection + moderation. Tasks have no trash — deletion is permanent. */
export default async function AdminTasksPage() {
  const staff = await requirePagePermission("tasks.view", "/admin/tasks");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Content"
        title="Tasks"
        description="Inspect tasks across workspaces. Archive is reversible; deletion is permanent and audited."
      />
      <ModerationManager entity="tasks" role={staff.role} />
    </div>
  );
}
