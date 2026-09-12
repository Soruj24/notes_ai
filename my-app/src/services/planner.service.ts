import { buildDayPlan, buildWeekPlan, type DayPlan, type PlannerOptions, type WeekPlan } from "@/src/lib/planning/scheduler";
import { isOverdueTask } from "@/src/lib/dates";
import { requireMembership } from "@/src/repositories/base";
import { listUserEvents } from "@/src/services/event.service";
import { getInsights } from "@/src/services/insights.service";
import { listUserProjects } from "@/src/services/project.service";
import { listUserTasks, updateUserTask } from "@/src/services/task.service";

/**
 * Planner orchestration. previewPlan is pure read (never mutates);
 * applyPlan writes start times only after explicit user confirmation.
 */

export async function previewPlan(
  userId: string,
  workspaceId: string,
  date: Date,
  options: PlannerOptions = {},
  now = new Date(),
): Promise<DayPlan> {
  await requireMembership(userId, workspaceId);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [tasks, events, projects] = await Promise.all([
    listUserTasks(userId, workspaceId, { limit: 200 }, now),
    listUserEvents(userId, workspaceId, { from: dayStart, to: dayEnd, limit: 100 }),
    listUserProjects(userId, workspaceId),
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const candidates = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .filter((t) => {
      if (!t.dueAt) return true;
      return new Date(t.dueAt).getTime() <= dayEnd.getTime() || isOverdueTask(t, now);
    })
    .slice(0, 50)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueAt: t.dueAt,
      durationMin: t.durationMin,
      overdue: isOverdueTask(t, now),
      projectName: t.projectId ? projectNames.get(t.projectId) : undefined,
    }));

  return buildDayPlan(
    new Date(date),
    candidates,
    events
      .filter((e) => e.status !== "cancelled")
      .map((e) => ({ start: e.startsAt, end: e.endsAt })),
    options,
    now,
  );
}

export function mondayOf(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Weekly preview (read-only). Capacity adapts to previous productivity:
 * low completion rates shrink the daily load to protect follow-through.
 */
export async function previewWeek(
  userId: string,
  workspaceId: string,
  date: Date,
  options: PlannerOptions = {},
  now = new Date(),
): Promise<WeekPlan & { capacityPerDay: number }> {
  await requireMembership(userId, workspaceId);
  const monday = mondayOf(date);
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 6);
  sundayEnd.setHours(23, 59, 59, 999);

  const [tasks, events, projects, insights] = await Promise.all([
    listUserTasks(userId, workspaceId, { limit: 200 }, now),
    listUserEvents(userId, workspaceId, { from: monday, to: sundayEnd, limit: 500 }),
    listUserProjects(userId, workspaceId),
    getInsights(userId, workspaceId, now),
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const capacityPerDay = insights.metrics.completionRate < 40 ? 5 : 8;

  const candidates = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .slice(0, 100)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueAt: t.dueAt,
      durationMin: t.durationMin,
      overdue: isOverdueTask(t, now),
      projectName: t.projectId ? projectNames.get(t.projectId) : undefined,
    }));

  const busyByDay = new Map<string, Array<{ start: Date; end: Date }>>();
  const dayKeyOf = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  for (const event of events) {
    if (event.status === "cancelled") continue;
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    // Multi-day events block every day they touch (clipped to each day).
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 8 && cursor.getTime() <= end.getTime(); i++) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const list = busyByDay.get(dayKeyOf(cursor)) ?? [];
      list.push({
        start: new Date(Math.max(start.getTime(), cursor.getTime())),
        end: new Date(Math.min(end.getTime(), dayEnd.getTime())),
      });
      busyByDay.set(dayKeyOf(cursor), list);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const plan = buildWeekPlan(monday, candidates, busyByDay, {
    ...options,
    maxTasksPerDay: options.maxTasksPerDay ?? capacityPerDay,
  }, now);
  return { ...plan, capacityPerDay };
}

export interface PlanApplyItem {
  taskId: string;
  start: string;
  durationMin: number;
}

export async function applyPlan(
  userId: string,
  workspaceId: string,
  items: PlanApplyItem[],
): Promise<{ applied: number; ids: string[] }> {
  await requireMembership(userId, workspaceId);
  if (!Array.isArray(items) || items.length > 50) {
    throw new Error("Provide 1–50 plan items.");
  }
  const ids: string[] = [];
  for (const item of items) {
    if (typeof item.taskId !== "string" || !item.taskId) {
      throw new Error("Each item needs a taskId.");
    }
    const start = new Date(item.start);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Each item needs a valid start time.");
    }
    const durationMin = Math.floor(Number(item.durationMin));
    if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
      throw new Error("Each item needs a duration of 15–240 minutes.");
    }
    await updateUserTask({
      userId,
      workspaceId,
      taskId: item.taskId,
      startAt: start,
      durationMin,
    });
    ids.push(item.taskId);
  }
  return { applied: ids.length, ids };
}
