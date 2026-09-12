import { PageHeader } from "@/src/components/admin/PageHeader";
import { ModerationManager } from "@/src/components/admin/moderation/ModerationManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace note inspection + moderation. Read-only content: lifecycle only. */
export default async function AdminNotesPage() {
  const staff = await requirePagePermission("notes.view", "/admin/notes");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Content"
        title="Notes"
        description="Inspect notes across workspaces. Excerpts only — bodies are never shown or edited. Every action is audited."
      />
      <ModerationManager entity="notes" role={staff.role} />
    </div>
  );
}
