import { PageHeader } from "@/src/components/admin/PageHeader";
import { AuditManager } from "@/src/components/admin/audit/AuditManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";
import { hasPermission } from "@/src/lib/rbac/roles";

/** Append-only audit explorer: search, filter, inspect, export. Read-only. */
export default async function AdminAuditLogsPage() {
  const staff = await requirePagePermission("audit.view", "/admin/audit-logs");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Audit Logs"
        description="Every privileged action and denied attempt. Append-only — entries cannot be edited or deleted from the console."
      />
      <AuditManager canExport={hasPermission(staff.role, "audit.export")} />
    </div>
  );
}
