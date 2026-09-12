import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskEditor } from "@/src/components/tasks/TaskEditor";
import { requireWorkspace } from "@/src/lib/workspace";
import { listTags } from "@/src/repositories/tag.repository";
import { getUserTask } from "@/src/services/task.service";
import { listUserProjects } from "@/src/services/project.service";
import { listUserGoals } from "@/src/services/goal.service";

export const metadata: Metadata = { title: "Task" };

interface TaskDetailProps {
  params: Promise<{ id: string }>;
}

/** Task detail + editor. First paint is server-rendered. */
export default async function TaskDetailPage({ params }: TaskDetailProps) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace(`/tasks/${id}`);
  let task;
  try {
    task = await getUserTask(user.id, workspace.id, id);
  } catch {
    notFound();
  }
  const [tags, projects, goals] = await Promise.all([
    listTags(user.id, workspace.id),
    listUserProjects(user.id, workspace.id),
    listUserGoals(user.id, workspace.id),
  ]);
  return (
    <TaskEditor
      wid={workspace.id}
      initialTask={task}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      projects={projects.map((p) => ({ id: p.id, label: p.name }))}
      goals={goals.map((g) => ({ id: g.id, label: g.title }))}
    />
  );
}
