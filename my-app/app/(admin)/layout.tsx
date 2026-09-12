import { AdminShell } from "@/src/components/admin/AdminShell";
import { MaintenancePage } from "@/src/components/layout/MaintenancePage";
import { requirePlatformRole } from "@/src/lib/rbac/guard";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";
import { getMaintenanceState } from "@/src/lib/settings/state";

/**
 * Admin route group layout. Gates every /admin/* page server-side: any
 * platform role may enter the console; individual pages enforce their own
 * permissions (defense in depth — layout is not the only check). When
 * maintenance mode excludes staff, the console also stands down (recovery
 * is a database procedure then — the UI says so honestly).
 */
export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [staff, maintenance] = await Promise.all([
    requirePlatformRole(PLATFORM_ROLES, "/admin"),
    getMaintenanceState(),
  ]);
  if (maintenance.enabled && !maintenance.allowAdminAccess) {
    return (
      <MaintenancePage
        message={maintenance.message}
        estimatedEndTime={maintenance.estimatedEndTime}
        allowAuthentication={maintenance.allowAuthentication}
      />
    );
  }
  return <AdminShell role={staff.role}>{children}</AdminShell>;
}
