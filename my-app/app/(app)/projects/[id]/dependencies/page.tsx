import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/src/lib/workspace";
import { getProjectDetail } from "@/src/services/project.service";
import { ProjectDependencyWorkspace } from "@/src/components/projects/ProjectDependencyWorkspace";

export const metadata: Metadata = { title: "Project Dependencies" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDependenciesWorkspacePage({ params }: Props) {
  const { id: projectId } = await params;
  const { user, workspace } = await requireWorkspace(`/projects/${projectId}/dependencies`);
  const detail = await getProjectDetail(user.id, workspace.id, projectId).catch((): never => notFound());
  return (
    <ProjectDependencyWorkspace
      wid={workspace.id}
      project={{ ...detail.project, progress: detail.progress }}
    />
  );
}
