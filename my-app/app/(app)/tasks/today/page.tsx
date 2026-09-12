import type { Metadata } from "next";
import { TasksPage } from "@/src/components/tasks/TasksPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const { workspace } = await requireWorkspace("/tasks/today");
  return <TasksPage wid={workspace.id} view="today" />;
}
