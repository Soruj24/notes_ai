import { requireMembership } from "@/src/repositories/base";
import { countUserTasks, listUserTasks } from "@/src/services/task.service";
import { listUserNotes } from "@/src/services/note.service";
import { listUserEvents } from "@/src/services/event.service";
import { listUserGoals } from "@/src/services/goal.service";
import { requireFlag } from "@/src/lib/features/evaluation";

export interface InsightItem {
  id: string;
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  body: string;
}

export interface InsightsResult {
  metrics: {
    doneToday: number;
    dueToday: number;
    overdue: number;
    upcoming: number;
    completionRate: number;
    notesThisWeek: number;
    eventsNext7Days: number;
    activeGoals: number;
    goalsAtRisk: number;
  };
  insights: InsightItem[];
}

/**
 * Rule-based productivity insights computed from live workspace data.
 * Deterministic (no LLM); the AI narrative layer builds on this in Phase 4.
 */
export async function getInsights(
  userId: string,
  workspaceId: string,
  now = new Date(),
): Promise<InsightsResult> {
  await requireFlag("analytics", userId);
  await requireMembership(userId, workspaceId);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [taskCounts, completed, notes, events, goals] = await Promise.all([
    countUserTasks(userId, workspaceId, now),
    listUserTasks(userId, workspaceId, { view: "completed", limit: 200 }, now),
    listUserNotes(userId, workspaceId, { limit: 200 }),
    listUserEvents(userId, workspaceId, { from: now, to: nextWeek, limit: 200 }),
    listUserGoals(userId, workspaceId),
  ]);

  const doneToday = completed.filter(
    (t) => t.completedAt && new Date(t.completedAt) >= todayStart,
  ).length;
  const notesThisWeek = notes.filter(
    (n) => new Date(n.createdAt) >= weekAgo,
  ).length;
  const activeGoals = goals.filter((g) => g.status === "active");
  const goalsAtRisk = activeGoals.filter(
    (g) => g.targetDate && new Date(g.targetDate) <= nextWeek,
  ).length;
  const completionRate =
    taskCounts.all > 0
      ? Math.round((taskCounts.completed / taskCounts.all) * 100)
      : 0;
  const dueToday = Math.max(0, taskCounts.today - taskCounts.overdue);

  const insights: InsightItem[] = [];
  if (taskCounts.overdue > 0) {
    insights.push({
      id: "overdue",
      tone: "danger",
      title: `${taskCounts.overdue} overdue ${taskCounts.overdue === 1 ? "task" : "tasks"}`,
      body: "Clear these first — overdue work compounds into tomorrow's load.",
    });
  }
  if (dueToday === 0 && taskCounts.overdue === 0) {
    insights.push({
      id: "clear-day",
      tone: "success",
      title: "Clear day ahead",
      body: "Nothing due today. A good slot for deep work or planning.",
    });
  } else if (dueToday > 0) {
    insights.push({
      id: "today-load",
      tone: "info",
      title: `${dueToday} due today`,
      body:
        dueToday > 5
          ? "Heavy day — consider moving the least urgent items."
          : "A focused list. Tackle the highest priority first.",
    });
  }
  if (completionRate >= 80 && taskCounts.all >= 5) {
    insights.push({
      id: "momentum",
      tone: "success",
      title: `${completionRate}% completion rate`,
      body: "Strong follow-through. Keep the streak going.",
    });
  } else if (taskCounts.all >= 5 && completionRate < 40) {
    insights.push({
      id: "backlog",
      tone: "warning",
      title: `${completionRate}% completion rate`,
      body: "Open tasks are piling up — archive or reschedule what no longer matters.",
    });
  }
  if (goalsAtRisk > 0) {
    insights.push({
      id: "goals-risk",
      tone: "warning",
      title: `${goalsAtRisk} ${goalsAtRisk === 1 ? "goal" : "goals"} due within 7 days`,
      body: "Review their linked tasks and adjust scope or deadlines.",
    });
  }
  if (notesThisWeek === 0) {
    insights.push({
      id: "capture",
      tone: "info",
      title: "No notes captured this week",
      body: "Writing things down frees working memory — capture one idea below.",
    });
  }

  return {
    metrics: {
      doneToday,
      dueToday,
      overdue: taskCounts.overdue,
      upcoming: taskCounts.upcoming,
      completionRate,
      notesThisWeek,
      eventsNext7Days: events.length,
      activeGoals: activeGoals.length,
      goalsAtRisk,
    },
    insights: insights.slice(0, 4),
  };
}
