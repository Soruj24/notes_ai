/**
 * Progress math. Computed from live data at read time — never persisted,
 * except Goal.progress as a manual fallback when no linked work exists.
 */

export interface Progress {
  done: number;
  total: number;
  /** 0–100 integer. Empty scopes report 0 (nothing done yet). */
  percent: number;
}

interface TaskLike {
  status: string;
}

export function progressFromTasks(tasks: TaskLike[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

interface MilestoneLike {
  done: boolean;
}

export function progressFromMilestones(milestones: MilestoneLike[]): Progress | null {
  if (!milestones.length) return null;
  const done = milestones.filter((m) => m.done).length;
  return { done, total: milestones.length, percent: Math.round((done / milestones.length) * 100) };
}

/**
 * Goal progress precedence: linked tasks (direct + via projects) →
 * milestones → stored manual fallback.
 */
export function goalProgress(input: {
  tasks: TaskLike[];
  milestones: MilestoneLike[];
  manual: number;
}): Progress & { source: "tasks" | "milestones" | "manual" } {
  if (input.tasks.length) {
    return { ...progressFromTasks(input.tasks), source: "tasks" };
  }
  const fromMilestones = progressFromMilestones(input.milestones);
  if (fromMilestones) return { ...fromMilestones, source: "milestones" };
  return { done: 0, total: 0, percent: Math.min(100, Math.max(0, input.manual)), source: "manual" };
}
