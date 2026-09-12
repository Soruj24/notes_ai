import { PageHeader } from "@/src/components/admin/PageHeader";
import { FeaturesManager } from "@/src/components/admin/features/FeaturesManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";
import { hasPermission } from "@/src/lib/rbac/roles";

/** Flag console: kill switches, rollouts, and targeting — backend enforced. */
export default async function AdminFeaturesPage() {
  const staff = await requirePagePermission("features.view", "/admin/features");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Features"
        description="Roll out or kill product surface without deploying. Toggles enforce backend-wide in services and routes — never frontend-only."
      />
      <FeaturesManager canEdit={hasPermission(staff.role, "features.update")} />
    </div>
  );
}
