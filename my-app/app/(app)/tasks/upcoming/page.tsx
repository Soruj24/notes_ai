import type { Metadata } from "next";
import { TasksPage } from "@/src/components/tasks/TasksPage";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Upcoming" };

export default async function UpcomingPage() {
  const { workspace } = await requireWorkspace("/tasks/upcoming");
  return <TasksPage wid={workspace.id} view="upcoming" />;
}
