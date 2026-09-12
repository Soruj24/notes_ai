import { requireMembership } from "@/src/repositories/base";
import { isOverdueTask } from "@/src/lib/dates";
import { listUserTasks } from "@/src/services/task.service";
import { listGoalsWithProgress } from "@/src/services/goal.service";
import { listProjectsWithProgress } from "@/src/services/project.service";
import { requireFlag } from "@/src/lib/features/evaluation";

export type AnalyticsRange = "today" | "week" | "month";

export interface DayBucket {
  date: string;
  completed: number;
  focusMin: number;
}

export interface AnalyticsResult {
  range: AnalyticsRange;
  from: string;
  to: string;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  /** Estimated from completed tasks' durations (30m default each). */
  focusMin: number;
  byPriority: Array<{ priority: string; total: number; done: number }>;
  byProject: Array<{ projectId: string; name: string; done: number; total: number; percent: number }>;
  goals: Array<{ id: string; title: string; percent: number; source: string }>;
  daily: DayBucket[];
}

const PRIORITIES = ["urgent", "high", "medium", "low"];
const DEFAULT_DURATION = 30;

function startOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Real-data analytics over a range. Every number derives from stored
 * tasks/goals/projects; focus time is an explicit estimate from completed
 * durations (documented in the type, never presented as measured).
 */
export async function getAnalytics(
  userId: string,
  workspaceId: string,
  range: AnalyticsRange,
  now = new Date(),
): Promise<AnalyticsResult> {
  await requireFlag("analytics", userId);
  await requireMembership(userId, workspaceId);
  const to = new Date(now);
  const from =
    range === "today"
      ? startOf(now)
      : range === "week"
        ? startOf(new Date(now.getTime() - 6 * 86400000))
        : startOf(new Date(now.getTime() - 29 * 86400000));

  const [tasks, goals, projects] = await Promise.all([
    listUserTasks(userId, workspaceId, { limit: 500 }, now),
    listGoalsWithProgress(userId, workspaceId),
    listProjectsWithProgress(userId, workspaceId),
  ]);

  const completedInRange = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completedAt &&
      new Date(t.completedAt) >= from &&
      new Date(t.completedAt) <= to,
  );
  const active = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const overdue = active.filter((t) => isOverdueTask(t, now)).length;
  const denom = completedInRange.length + active.length;
  const focusMin = completedInRange.reduce(
    (n, t) => n + (t.durationMin ?? DEFAULT_DURATION),
    0,
  );

  const byPriority = PRIORITIES.map((priority) => {
    const scoped = tasks.filter((t) => t.priority === priority && t.status !== "archived");
    return {
      priority,
      total: scoped.length,
      done: scoped.filter((t) => t.status === "done").length,
    };
  });

  const byProject = projects.map((w) => ({
    projectId: w.project.id,
    name: w.project.name,
    done: w.progress.done,
    total: w.progress.total,
    percent: w.progress.percent,
  }));

  // Daily buckets across the range (completed + focus per day).
  const buckets = new Map<string, DayBucket>();
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const key = dayKeyOf(cursor);
    buckets.set(key, { date: key, completed: 0, focusMin: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const task of completedInRange) {
    const key = dayKeyOf(new Date(task.completedAt as Date));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.completed += 1;
    bucket.focusMin += task.durationMin ?? DEFAULT_DURATION;
  }

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    completedTasks: completedInRange.length,
    overdueTasks: overdue,
    completionRate: denom ? Math.round((completedInRange.length / denom) * 100) : 0,
    focusMin,
    byPriority,
    byProject,
    goals: goals
      .filter((w) => w.goal.status === "active")
      .map((w) => ({
        id: w.goal.id,
        title: w.goal.title,
        percent: w.progress.percent,
        source: w.progress.source,
      })),
    daily: [...buckets.values()],
  };
}
