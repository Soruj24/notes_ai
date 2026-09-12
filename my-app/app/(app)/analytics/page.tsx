import type { Metadata } from "next";
import { AnalyticsPage } from "@/src/components/analytics/AnalyticsPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsHome() {
  const { workspace } = await requireWorkspace("/analytics");
  return <AnalyticsPage wid={workspace.id} />;
}
