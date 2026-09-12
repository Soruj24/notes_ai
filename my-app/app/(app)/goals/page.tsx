import type { Metadata } from "next";
import { GoalsExplorer } from "@/src/components/goals/GoalsExplorer";
import { requireWorkspace } from "@/src/lib/workspace";
import { listGoalsWithProgress } from "@/src/services/goal.service";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsHome() {
  const { user, workspace } = await requireWorkspace("/goals");
  const withProgress = await listGoalsWithProgress(user.id, workspace.id);
  return (
    <GoalsExplorer
      wid={workspace.id}
      initial={withProgress.map((w) => ({ ...w.goal, computedProgress: w.progress }))}
    />
  );
}
