import type { Metadata } from "next";
import { TasksPage } from "@/src/components/tasks/TasksPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Completed" };

export default async function CompletedPage() {
  const { workspace } = await requireWorkspace("/tasks/completed");
  return <TasksPage wid={workspace.id} view="completed" />;
}
