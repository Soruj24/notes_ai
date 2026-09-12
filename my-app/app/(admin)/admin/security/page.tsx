import { PageHeader } from "@/src/components/admin/PageHeader";
import { SecurityManager } from "@/src/components/admin/security/SecurityManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Security console: logins, threats, sessions, denials. Read-only. */
export default async function AdminSecurityPage() {
  await requirePagePermission("security.view", "/admin/security");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Security"
        description="Failed logins, suspicious activity, session and rate-limit events, admin actions, and blocked requests. Metadata is sanitized — secrets never stored."
      />
      <SecurityManager />
    </div>
  );
}
