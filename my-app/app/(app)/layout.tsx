import { AppShell } from "@/src/components/layout/AppShell";
import { MaintenancePage } from "@/src/components/layout/MaintenancePage";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getMaintenanceState, getSettingValue } from "@/src/lib/settings/state";

/**
 * Workspace layout. Mounts AppShell once per session within this group;
 * navigating between (app) routes swaps only {children}. During
 * maintenance mode, callers outside the configured access stay on a
 * downtime page instead.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, maintenance, siteName] = await Promise.all([
    getCurrentUser(),
    getMaintenanceState(),
    getSettingValue("site.name", "NotoAI"),
  ]);
  const staffAllowed = user?.role != null && maintenance.allowAdminAccess;
  if (maintenance.enabled && !staffAllowed) {
    return (
      <MaintenancePage
        message={maintenance.message}
        estimatedEndTime={maintenance.estimatedEndTime}
        allowAuthentication={maintenance.allowAuthentication}
      />
    );
  }
  return (
    <AppShell userId={user?.id ?? null} role={user?.role ?? null} siteName={siteName}>
      {children}
    </AppShell>
  );
}
