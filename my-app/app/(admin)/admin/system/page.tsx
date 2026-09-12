import { Activity } from "lucide-react";
import { PageHeader } from "@/src/components/admin/PageHeader";
import { EmptyState } from "@/src/components/ui/empty-state";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Jobs, scheduler runs, and index maintenance. */
export default async function AdminSystemPage() {
  await requirePagePermission("system.view", "/admin/system");
  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="System"
        description="Background jobs, reminder dispatch runs, and reindex controls."
      />
      <EmptyState
        icon={<Activity size={20} aria-hidden="true" />}
        title="Job controls connect here"
        description="Dispatch reruns, embedding reindex, and job history land with the operations phase."
      />
    </div>
  );
}
