import type { Metadata } from "next";
import { ProjectsExplorer } from "@/src/components/projects/ProjectsExplorer";
import { requireWorkspace } from "@/src/lib/workspace";
import { listProjectsWithProgress } from "@/src/services/project.service";
import { listUserGoals } from "@/src/services/goal.service";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsHome() {
  const { user, workspace } = await requireWorkspace("/projects");
  const [withProgress, goals] = await Promise.all([
    listProjectsWithProgress(user.id, workspace.id),
    listUserGoals(user.id, workspace.id),
  ]);
  return (
    <ProjectsExplorer
      wid={workspace.id}
      initial={withProgress.map((w) => ({ ...w.project, progress: w.progress }))}
      goals={goals.map((g) => ({ id: g.id, label: g.title }))}
    />
  );
}
