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

  const [tasks, events, projects, insights, depGraph] = await Promise.all([
    listUserTasks(userId, workspaceId, { limit: 200 }, now),
    listUserEvents(userId, workspaceId, { from: dayStart, to: dayEnd, limit: 100 }),
    listUserProjects(userId, workspaceId),
    getInsights(userId, workspaceId, now).catch(() => null),
    (async () => {
      try {
        const { getTaskDependencyGraph } = await import("@/src/services/task-dependency.service");
        return await getTaskDependencyGraph(userId, workspaceId);
      } catch {
        return null;
      }
    })(),
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  // Workspace goals for candidate enrichment
  let goals: Array<{ id: string; title: string }> = [];
  try {
    const { listUserGoals } = await import("@/src/services/goal.service");
    goals = await listUserGoals(userId, workspaceId);
  } catch {
    goals = [];
  }
  const goalMap = new Map(goals.map((g) => [g.id, g.title]));

  // Dependency-aware: blocked vs ready via DAG blockedClosure, critical path, downstream counts
  const blockedMap = depGraph?.blocked ?? {};
  const criticalSet = new Set(depGraph?.criticalPath.path ?? []);
  // downstream dependents count (how many tasks this one unblocks, transitive via forward edges)
  const downstreamCounts = (() => {
    if (!depGraph) return new Map<string, number>();
    const fwd = new Map<string, string[]>();
    for (const n of depGraph.nodes) fwd.set(n.id, []);
    for (const e of depGraph.edges) fwd.get(e.predecessorTaskId)?.push(e.successorTaskId);
    const memo = new Map<string, number>();
    const dfs = (id: string, vis: Set<string> = new Set()): number => {
      if (memo.has(id)) return memo.get(id)!;
      if (vis.has(id)) return 0;
      vis.add(id);
      let count = 0;
      for (const succ of fwd.get(id) ?? []) {
        count += 1 + dfs(succ, new Set(vis));
      }
      memo.set(id, count);
      return count;
    };
    for (const n of depGraph.nodes) dfs(n.id);
    return memo;
  })();

  const candidates = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    // Dependency-aware filter: blocked tasks are not ready and are excluded from day plan
    .filter((t) => !blockedMap[t.id])
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
      goalTitle: t.goalId ? goalMap.get(t.goalId) : undefined,
      blocked: !!blockedMap[t.id],
      ready: !blockedMap[t.id],
      critical: criticalSet.has(t.id),
      dependentsCount: downstreamCounts.get(t.id) ?? 0,
    }));

  // Prioritize tasks that unblock other important tasks (higher dependents, critical)
  candidates.sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    if ((b.dependentsCount ?? 0) !== (a.dependentsCount ?? 0)) return (b.dependentsCount ?? 0) - (a.dependentsCount ?? 0);
    return 0;
  });

  // Keep capacity adaptive like weekly plan
  const capacityPerDay = insights?.metrics.completionRate !== undefined && insights.metrics.completionRate < 40 ? 5 : 8;
  return buildDayPlan(
    new Date(date),
    candidates as never,
    events
      .filter((e) => e.status !== "cancelled")
      .map((e) => ({ start: e.startsAt, end: e.endsAt })),
    { ...options, maxTasksPerDay: options.maxTasksPerDay ?? capacityPerDay },
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
  let weekGoals: Array<{ id: string; title: string }> = [];
  try {
    const { listUserGoals } = await import("@/src/services/goal.service");
    weekGoals = await listUserGoals(userId, workspaceId);
  } catch {
    weekGoals = [];
  }
  const weekGoalMap = new Map(weekGoals.map((g) => [g.id, g.title]));
  const capacityPerDay = insights.metrics.completionRate < 40 ? 5 : 8;

  // Dependency-aware for week as well: blocked vs ready, chains, critical
  let weekBlocked: Record<string, boolean> = {};
  let weekCritical = new Set<string>();
  let weekDependents = new Map<string, number>();
  try {
    const { getTaskDependencyGraph } = await import("@/src/services/task-dependency.service");
    const wg = await getTaskDependencyGraph(userId, workspaceId);
    weekBlocked = wg.blocked;
    weekCritical = new Set(wg.criticalPath.path);
    const fwd = new Map<string, string[]>();
    for (const n of wg.nodes) fwd.set(n.id, []);
    for (const e of wg.edges) fwd.get(e.predecessorTaskId)?.push(e.successorTaskId);
    const memo = new Map<string, number>();
    const dfs = (id: string, vis = new Set<string>()): number => {
      if (memo.has(id)) return memo.get(id)!;
      if (vis.has(id)) return 0;
      vis.add(id);
      let c = 0;
      for (const succ of fwd.get(id) ?? []) c += 1 + dfs(succ, new Set(vis));
      memo.set(id, c);
      return c;
    };
    for (const n of wg.nodes) dfs(n.id);
    weekDependents = memo;
  } catch {
    // graph unavailable — proceed without dependency weighting
  }

  const candidates = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .filter((t) => !weekBlocked[t.id])
    .slice(0, 100)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueAt: t.dueAt,
      durationMin: t.durationMin,
      overdue: isOverdueTask(t, now),
      projectName: t.projectId ? projectNames.get(t.projectId) : undefined,
      goalTitle: t.goalId ? weekGoalMap.get(t.goalId) : undefined,
      critical: weekCritical.has(t.id),
      dependentsCount: weekDependents.get(t.id) ?? 0,
    }))
    .sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      if ((b.dependentsCount ?? 0) !== (a.dependentsCount ?? 0)) return (b.dependentsCount ?? 0) - (a.dependentsCount ?? 0);
      return 0;
    });

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
