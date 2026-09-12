import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCheck,
  ListTodo,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { TasksView } from "@/src/components/tasks/types";

const copy: Record<TasksView, { icon: ReactNode; title: string; description: string }> = {
  all: {
    icon: <ListTodo size={20} aria-hidden="true" />,
    title: "No tasks yet",
    description: "Add your first task above. Set dates, priorities, and subtasks as you go.",
  },
  today: {
    icon: <Sun size={20} aria-hidden="true" />,
    title: "Nothing due today",
    description: "A clear day. Overdue tasks show up here too when they appear.",
  },
  upcoming: {
    icon: <CalendarClock size={20} aria-hidden="true" />,
    title: "Nothing upcoming",
    description: "Tasks with future due dates will land here.",
  },
  completed: {
    icon: <CheckCheck size={20} aria-hidden="true" />,
    title: "Nothing completed yet",
    description: "Finished tasks collect here for review.",
  },
  overdue: {
    icon: <TriangleAlert size={20} aria-hidden="true" />,
    title: "Nothing overdue",
    description: "Everything is on track. Nice work.",
  },
};

/** Contextual empty state per tasks view. */
export function TaskEmptyState({ view }: { view: TasksView }) {
  const c = copy[view];
  return <EmptyState icon={c.icon} title={c.title} description={c.description} />;
}
