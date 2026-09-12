/** Shared DTOs for the tasks UI (server records and API JSON both fit). */

export type TasksView = "all" | "today" | "upcoming" | "completed" | "overdue";

export interface SubtaskDTO {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string | Date;
}

export interface TaskDTO {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  notes?: string;
  status: string;
  priority: string;
  startAt?: string | Date;
  dueAt?: string | Date;
  durationMin?: number;
  completedAt?: string | Date;
  projectId?: string;
  goalId?: string;
  tags: string[];
  subtasks: SubtaskDTO[];
  recurrence: string;
  recurrenceUntil?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TaskCountsDTO {
  all: number;
  today: number;
  upcoming: number;
  completed: number;
  overdue: number;
}

export interface TagDTO {
  id: string;
  name: string;
  color?: string;
}

export interface LinkOption {
  id: string;
  label: string;
}

export type TaskSort = "due" | "priority" | "updated";

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortTasks(tasks: TaskDTO[], sort: TaskSort): TaskDTO[] {
  const copy = [...tasks];
  if (sort === "priority") {
    copy.sort(
      (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
    );
  } else if (sort === "updated") {
    copy.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } else {
    copy.sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }
  return copy;
}

export function isOverdue(task: TaskDTO, now = new Date()): boolean {
  if (!task.dueAt || (task.status !== "todo" && task.status !== "in_progress")) {
    return false;
  }
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return new Date(task.dueAt).getTime() < day.getTime();
}

export function formatDue(value: string | Date | undefined): string {
  if (!value) return "No due date";
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86400000);
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  if (diffDays === -1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

export function subtaskProgress(task: TaskDTO): { done: number; total: number } {
  const total = task.subtasks.length;
  return { done: task.subtasks.filter((s) => s.done).length, total };
}
