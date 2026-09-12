import { PageHeader } from "@/src/components/admin/PageHeader";
import { AdminDashboard } from "@/src/components/admin/dashboard/AdminDashboard";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";
import { requirePlatformRole } from "@/src/lib/rbac/guard";

/**
 * Console home: live platform dashboard. The layout already gates staff,
 * but this page re-asserts it for a correct ?next= target on redirect.
 * All numbers come from /api/admin/dashboard/* (real database data);
 * each section below owns its loading, empty, and error states.
 */
export default async function AdminOverviewPage() {
  await requirePlatformRole(PLATFORM_ROLES, "/admin");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Admin Console"
        title="Dashboard"
        description="Live platform posture — users, content, AI usage, security, and system health."
      />
      <AdminDashboard />
    </div>
  );
}
