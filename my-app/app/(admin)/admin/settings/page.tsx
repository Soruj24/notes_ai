import { PageHeader } from "@/src/components/admin/PageHeader";
import { SettingsManager } from "@/src/components/admin/settings/SettingsManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** System settings: typed, validated, permission-gated, audited. */
export default async function AdminSettingsPage() {
  const staff = await requirePagePermission("settings.view", "/admin/settings");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        description="Typed product configuration. Every save validates and audits; resets restore defaults."
      />
      <SettingsManager role={staff.role} />
    </div>
  );
}
