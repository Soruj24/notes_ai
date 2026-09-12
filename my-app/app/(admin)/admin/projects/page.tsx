import { PageHeader } from "@/src/components/admin/PageHeader";
import { ModerationManager } from "@/src/components/admin/moderation/ModerationManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace project inspection + moderation. */
export default async function AdminProjectsPage() {
  const staff = await requirePagePermission("projects.view", "/admin/projects");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Content"
        title="Projects"
        description="Inspect projects across workspaces. Archiving never touches linked tasks; deletion is permanent and audited."
      />
      <ModerationManager entity="projects" role={staff.role} />
    </div>
  );
}
