import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoalDetail } from "@/src/components/goals/GoalDetail";
import { requireWorkspace } from "@/src/lib/workspace";
import { getGoalDetail } from "@/src/services/goal.service";
import { listProjectsWithProgress } from "@/src/services/project.service";

export const metadata: Metadata = { title: "Goal" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GoalDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace(`/goals/${id}`);
  const [detail, projects] = await Promise.all([
    getGoalDetail(user.id, workspace.id, id).catch((): never => notFound()),
    listProjectsWithProgress(user.id, workspace.id),
  ]);
  const linked = projects.filter((w) => w.project.goalId === id);
  return (
    <GoalDetail
      wid={workspace.id}
      goal={{ ...detail.goal, computedProgress: detail.progress }}
      projects={linked.map((w) => ({ ...w.project, progress: w.progress }))}
      tasks={detail.tasks}
    />
  );
}
