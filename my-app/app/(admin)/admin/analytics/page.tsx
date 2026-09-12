import { PageHeader } from "@/src/components/admin/PageHeader";
import { AnalyticsManager } from "@/src/components/admin/analytics/AnalyticsManager";
import { requirePagePermission } from "@/src/lib/rbac/guard";

/** Platform analytics: growth, engagement, content, AI, errors, features. */
export default async function AdminAnalyticsPage() {
  await requirePagePermission("analytics.view", "/admin/analytics");

  return (
    <div className="grid content-start gap-4">
      <PageHeader
        eyebrow="Platform"
        title="Analytics"
        description="Growth, engagement, and AI usage from bounded database aggregations."
      />
      <AnalyticsManager />
    </div>
  );
}
