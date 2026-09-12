import { PageHeader } from "@/src/components/admin/PageHeader";
import { MaintenanceManager } from "@/src/components/admin/maintenance/MaintenanceManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";
import { hasPermission } from "@/src/lib/rbac/roles";

/** Maintenance console: downtime switch, message, end time, access rules. */
export default async function AdminMaintenancePage() {
  const staff = await requirePagePermission("settings.view", "/admin/system/maintenance");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform · System"
        title="Maintenance"
        description="Downtime control with configured access rules. Changes apply immediately and audit."
      />
      <MaintenanceManager canEdit={hasPermission(staff.role, "settings.update")} />
    </div>
  );
}
