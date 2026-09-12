import { PageHeader } from "@/src/components/admin/PageHeader";
import { AIControlCenter } from "@/src/components/admin/ai/AIControlCenter";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** AI Control Center: providers, models, agent, tools, prompts, usage, limits, errors, config. */
export default async function AdminAiPage() {
  const staff = await requirePagePermission("ai.view", "/admin/ai");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="AI Control Center"
        description="Provider status, model selection, agent behavior, tool access, prompts, usage, budgets, and errors. Secrets stay server-side; every change is audited."
      />
      <AIControlCenter role={staff.role} />
    </div>
  );
}
