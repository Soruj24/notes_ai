import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/src/components/projects/ProjectDetail";
import { requireWorkspace } from "@/src/lib/workspace";
import { getProjectDetail } from "@/src/services/project.service";
import { listUserGoals } from "@/src/services/goal.service";

export const metadata: Metadata = { title: "Project" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace(`/projects/${id}`);
  const [detail, goals] = await Promise.all([
    getProjectDetail(user.id, workspace.id, id).catch((): never => notFound()),
    listUserGoals(user.id, workspace.id),
  ]);
  return (
    <ProjectDetail
      wid={workspace.id}
      project={{ ...detail.project, progress: detail.progress }}
      notes={detail.notes}
      goals={goals.map((g) => ({ id: g.id, label: g.title }))}
    />
  );
}
