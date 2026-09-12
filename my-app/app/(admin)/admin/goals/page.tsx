import { PageHeader } from "@/src/components/admin/PageHeader";
import { ModerationManager } from "@/src/components/admin/moderation/ModerationManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace goal inspection + moderation. */
export default async function AdminGoalsPage() {
  const staff = await requirePagePermission("goals.view", "/admin/goals");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Content"
        title="Goals"
        description="Inspect goals across workspaces. Abandoning keeps progress history; deletion is permanent and audited."
      />
      <ModerationManager entity="goals" role={staff.role} />
    </div>
  );
}
