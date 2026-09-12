import type { Metadata } from "next";
import { DashboardPage } from "@/src/components/dashboard/DashboardPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Dashboard" };

/** Overview: real data only — every section fetches live APIs. */
export default async function DashboardHome() {
  const { user, workspace } = await requireWorkspace("/dashboard");
  return <DashboardPage wid={workspace.id} userName={user.name} />;
}
