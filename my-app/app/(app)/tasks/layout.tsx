import { TasksSidebar } from "@/src/components/tasks/TasksSidebar";
import { TasksViewTabs } from "@/src/components/tasks/TasksViewTabs";
import { requireWorkspace } from "@/src/lib/workspace";
import { countUserTasks } from "@/src/services/task.service";

/** Tasks section layout: persistent sidebar + content. */
export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await requireWorkspace("/tasks");
  const counts = await countUserTasks(user.id, workspace.id);
  return (
    <div className="flex items-start gap-5 lg:gap-8">
      <div className="hidden shrink-0 md:block">
        <TasksSidebar counts={counts} active="/tasks" />
      </div>
      <div className="grid min-w-0 flex-1 gap-4">
        <TasksViewTabs />
        {children}
      </div>
    </div>
  );
}
