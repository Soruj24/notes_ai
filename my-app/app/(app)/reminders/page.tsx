import type { Metadata } from "next";
import { RemindersExplorer } from "@/src/components/reminders/RemindersExplorer";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const { workspace } = await requireWorkspace("/reminders");
  return <RemindersExplorer wid={workspace.id} />;
}
