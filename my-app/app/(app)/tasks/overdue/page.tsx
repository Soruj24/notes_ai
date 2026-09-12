import type { Metadata } from "next";
import { TasksPage } from "@/src/components/tasks/TasksPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Overdue" };

export default async function OverduePage() {
  const { workspace } = await requireWorkspace("/tasks/overdue");
  return <TasksPage wid={workspace.id} view="overdue" />;
}
