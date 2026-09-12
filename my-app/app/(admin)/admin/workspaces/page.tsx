import { Suspense } from "react";
import { PageHeader } from "@/src/components/admin/PageHeader";
import { WorkspacesManager } from "@/src/components/admin/workspaces/WorkspacesManager";
import { WorkspaceTableSkeleton } from "@/src/components/admin/workspaces/WorkspaceTable";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Cross-workspace directory: search, filter, sort, inspect, lifecycle. */
export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await requirePagePermission("workspaces.view", "/admin/workspaces");
  const params = await searchParams;

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Manage"
        title="Workspaces"
        description="Inspect usage and operate lifecycles. Suspend, archive, and delete are enforced by the service layer and audited."
      />
      <Suspense fallback={<WorkspaceTableSkeleton />}>
        <WorkspacesManager role={staff.role} initialQuery={params.q ?? ""} />
      </Suspense>
    </div>
  );
}
