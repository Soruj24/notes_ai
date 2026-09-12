/**
 * Deterministic day planner. Pure function: candidate tasks + busy blocks
 * in, Morning/Afternoon/Evening blocks out. No LLM, no I/O — unit-testable
 * and free. The AI agent calls it through the plan_day tool; the planner
 * page calls the same code through the planner service.
 */

export interface PlanCandidate {
  id: string;
  title: string;
  priority: string;
  dueAt?: Date | string | null;
  durationMin?: number | null;
  overdue: boolean;
  projectName?: string;
  goalTitle?: string;
  blocked?: boolean;
  ready?: boolean;
  critical?: boolean;
  dependentsCount?: number;
}

export interface BusyBlock {
  start: Date | string;
  end: Date | string;
}

export interface PlannedItem {
  taskId: string;
  title: string;
  start: Date;
  durationMin: number;
  reason: string;
}

export interface PlanBlock {
  name: "Morning" | "Afternoon" | "Evening";
  items: PlannedItem[];
}

export interface UnscheduledItem {
  taskId: string;
  title: string;
  reason: string;
}

export interface DayPlan {
  date: string;
  blocks: PlanBlock[];
  unscheduled: UnscheduledItem[];
}

export interface PlannerOptions {
  workStartHour?: number;
  workEndHour?: number;
  lunchStartHour?: number;
  lunchEndHour?: number;
  eveningEndHour?: number;
  /** Max tasks placed per day; overflow carries as unscheduled. */
  maxTasksPerDay?: number;
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const DEFAULT_DURATION = 30;

function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function reasonFor(c: PlanCandidate, now: Date): string {
  const parts: string[] = [];
  // Dependency-aware: tasks that unblock others are explained
  if (c.critical) parts.push("Critical path");
  if (c.dependentsCount && c.dependentsCount > 0) {
    parts.push(`Unblocks ${c.dependentsCount} task${c.dependentsCount === 1 ? "" : "s"}`);
  }
  if (c.overdue) {
    parts.push("Overdue — clear first");
  } else if (c.dueAt) {
    const due = new Date(c.dueAt);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const day = new Date(due);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((day.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 0) parts.push("Due today");
    else if (diffDays === 1) parts.push("Due tomorrow — get ahead");
    else parts.push(`Due in ${diffDays} days`);
  }
  if (c.priority === "urgent" || c.priority === "high") {
    parts.push(`${c.priority} priority`);
  }
  if (c.projectName) parts.push(`advances ${c.projectName}`);
  if (c.goalTitle) parts.push(`goal: ${c.goalTitle}`);
  if (!parts.length) parts.push("Fits your day");
  // Keep brief — max 3 parts
  return parts.slice(0, 3).join(" · ");
}

function sortKey(c: PlanCandidate): [number, number, number, number, number] {
  // Blocked tasks are already filtered in planner.service, but keep as last resort sort
  if (c.blocked) return [9, 9, Number.MAX_SAFE_INTEGER, 9, 9] as never;
  const dueTime = c.dueAt ? new Date(c.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  // Priority boost for unblocking: more dependents first, critical before non-critical
  const unblockRank = c.dependentsCount ? Math.max(0, 10 - Math.min(10, c.dependentsCount)) : 10;
  const criticalRank = c.critical ? 0 : 1;
  return [
    c.overdue ? 0 : 1,
    criticalRank,
    unblockRank,
    dueTime,
    PRIORITY_RANK[c.priority] ?? 9,
  ] as unknown as [number, number, number, number, number];
}

interface FreeSlot {
  start: number;
  end: number;
}

function subtractBusy(slots: FreeSlot[], busy: FreeSlot[]): FreeSlot[] {
  let free = slots;
  for (const b of busy) {
    const next: FreeSlot[] = [];
    for (const s of free) {
      if (b.end <= s.start || b.start >= s.end) {
        next.push(s);
        continue;
      }
      if (b.start > s.start) next.push({ start: s.start, end: b.start });
      if (b.end < s.end) next.push({ start: b.end, end: s.end });
    }
    free = next;
  }
  return free.filter((s) => s.end - s.start >= 5 * 60000);
}

export function buildDayPlan(
  date: Date,
  candidates: PlanCandidate[],
  busy: BusyBlock[],
  options: PlannerOptions = {},
  now = new Date(),
): DayPlan {
  const {
    workStartHour = 9,
    workEndHour = 17,
    lunchStartHour = 12,
    lunchEndHour = 13,
    eveningEndHour = 20,
    maxTasksPerDay = Number.POSITIVE_INFINITY,
  } = options;

  const windows: Array<{ name: PlanBlock["name"]; start: Date; end: Date }> = [
    { name: "Morning", start: atHour(date, workStartHour), end: atHour(date, lunchStartHour) },
    { name: "Afternoon", start: atHour(date, lunchEndHour), end: atHour(date, workEndHour) },
    { name: "Evening", start: atHour(date, workEndHour), end: atHour(date, eveningEndHour) },
  ];

  const busyMs: FreeSlot[] = busy.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const blocks: PlanBlock[] = windows.map((w) => {
    const free = subtractBusy(
      [{ start: w.start.getTime(), end: w.end.getTime() }],
      busyMs,
    );
    return { name: w.name, free, items: [] } as PlanBlock & { free: FreeSlot[] };
  });

  const ordered = [...candidates].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });

  const unscheduled: UnscheduledItem[] = [];
  let placedCount = 0;
  for (const candidate of ordered) {
    if (placedCount >= maxTasksPerDay) {
      unscheduled.push({
        taskId: candidate.id,
        title: candidate.title,
        reason: "Over the daily capacity — move to another day or reduce scope.",
      });
      continue;
    }
    const durationMin = Math.max(
      15,
      Math.min(candidate.durationMin ?? DEFAULT_DURATION, 240),
    );
    const durationMs = durationMin * 60000;
    let fit = false;
    for (const block of blocks as Array<PlanBlock & { free: FreeSlot[] }>) {
      const slotIndex = block.free.findIndex((s) => s.end - s.start >= durationMs);
      if (slotIndex === -1) continue;
      const slot = block.free[slotIndex];
      const start = new Date(slot.start);
      block.items.push({
        taskId: candidate.id,
        title: candidate.title,
        start,
        durationMin,
        reason: reasonFor(candidate, now),
      });
      slot.start += durationMs;
      fit = true;
      placedCount += 1;
      break;
    }
    if (!fit) {
      unscheduled.push({
        taskId: candidate.id,
        title: candidate.title,
        reason: "Doesn't fit the remaining free time — reschedule or split it.",
      });
    }
  }

  return {
    date: new Date(date).toISOString(),
    blocks: blocks.map(({ name, items }) => ({ name, items })),
    unscheduled,
  };
}

export interface WeekDayPlan extends DayPlan {
  weekday: string;
}

export interface WeekPlan {
  weekStart: string;
  days: WeekDayPlan[];
  /** Leftovers after Sunday: genuinely beyond weekly capacity. */
  unscheduled: UnscheduledItem[];
  summary: {
    scheduled: number;
    minutes: number;
    overdueCleared: number;
  };
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Distribute candidates across Mon–Sun. Each day runs the day engine;
 * placed tasks carry over out of the pool. Due-dated tasks sort earliest
 * so they land on or before their deadline; overdue items clear Monday.
 */
export function buildWeekPlan(
  weekStartMonday: Date,
  candidates: PlanCandidate[],
  busyByDay: Map<string, BusyBlock[]> | Record<string, BusyBlock[]>,
  options: PlannerOptions = {},
  now = new Date(),
): WeekPlan {
  const busyFor = (day: Date): BusyBlock[] => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    if (busyByDay instanceof Map) return busyByDay.get(key) ?? [];
    return (busyByDay as Record<string, BusyBlock[]>)[key] ?? [];
  };

  // Greedy day-by-day: each day runs the day engine over everything left.
  // Due-dated tasks sort earliest, so they land on or before their deadline;
  // overdue items clear Monday; undated work fills the gaps.
  let remaining = [...candidates];
  const days: WeekDayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartMonday);
    day.setDate(weekStartMonday.getDate() + i);
    const plan = buildDayPlan(day, remaining, busyFor(day), options, now);
    const placedIds = new Set(
      plan.blocks.flatMap((b) => b.items.map((item) => item.taskId)),
    );
    remaining = remaining.filter((c) => !placedIds.has(c.id));
    days.push({ ...plan, weekday: WEEKDAYS[i] });
  }

  const scheduled = days.flatMap((d) =>
    d.blocks.flatMap((b) => b.items),
  );
  const minutes = scheduled.reduce((n, i) => n + i.durationMin, 0);
  return {
    weekStart: new Date(weekStartMonday).toISOString(),
    days,
    unscheduled: remaining.map((c) => ({
      taskId: c.id,
      title: c.title,
      reason: "Beyond this week's capacity — push to next week or descope.",
    })),
    summary: {
      scheduled: scheduled.length,
      minutes,
      overdueCleared: scheduled.filter((i) =>
        candidates.find((c) => c.id === i.taskId)?.overdue,
      ).length,
    },
  };
}
