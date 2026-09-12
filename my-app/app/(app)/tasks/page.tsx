import type { Metadata } from "next";
import { TasksPage } from "@/src/components/tasks/TasksPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Tasks" };

/** All tasks view. List data loads client-side via RTK Query cache. */
export default async function AllTasksPage() {
  const { workspace } = await requireWorkspace("/tasks");
  return <TasksPage wid={workspace.id} view="all" />;
}
