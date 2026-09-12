import type { AnalyticsRange } from "@/src/lib/validation/analytics";
import {
  activeUsersPerDay,
  activityByEntity,
  activityPerDay,
  aiConversationCount,
  aiConversationsByModel,
  aiMessagesPerDay,
  aiTokenTotals,
  aiTokensPerDay,
  distinctActiveUsers,
  eventsPerDay,
  failedRunsPerDay,
  notesPerDay,
  rateLimitedPerDay,
  tasksCompletedPerDay,
  tasksPerDay,
  usersPerDay,
} from "@/src/repositories/admin-stats.repository";
import { countUsers } from "@/src/repositories/user.repository";

/**
 * Platform analytics over an explicit UTC day window. Every number comes
 * from bounded repository aggregations ($match on indexed dates → $group
 * by day); raw documents are never loaded — only per-day counts and id
 * sets. Read-only and side-effect free.
 */

export interface DayPoint {
  date: string;
  value: number;
}

export interface AdminAnalytics {
  range: { key: string; days: number; since: string; until: string };
  users: { newPerDay: DayPoint[]; cumulative: DayPoint[]; total: number; newTotal: number };
  activity: { dau: DayPoint[]; dauLatest: number; wau: number; mau: number };
  content: {
    notesCreated: DayPoint[];
    tasksCreated: DayPoint[];
    tasksCompleted: DayPoint[];
    eventsCreated: DayPoint[];
    totals: { notes: number; tasks: number; completed: number; events: number };
  };
  ai: {
    messagesPerDay: DayPoint[];
    tokensPerDay: DayPoint[];
    errorsPerDay: DayPoint[];
    totals: { conversations: number; messages: number; tokens: number; errors: number };
  };
  features: Array<{ key: string; uses: number }>;
}

const DAY_MS = 86_400_000;

function dayKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function dayKeys(since: Date, days: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) keys.push(dayKeyOf(new Date(since.getTime() + i * DAY_MS)));
  return keys;
}

function fill(keys: string[], counts: Map<string, number>): DayPoint[] {
  return keys.map((date) => ({ date, value: counts.get(date) ?? 0 }));
}

export async function getAdminAnalytics(range: AnalyticsRange, now = new Date()): Promise<AdminAnalytics> {
  const { since, until, days, key } = range;
  const keys = dayKeys(since, days);

  const [
    userCounts,
    totalUsers,
    notesCounts,
    tasksCounts,
    completedCounts,
    eventsCounts,
    messageCounts,
    tokenCounts,
    rateCounts,
    failedCounts,
    tokenTotals,
    conversations,
    byModel,
    featureRows,
    activitySets,
    loginSets,
    aiSets,
  ] = await Promise.all([
    usersPerDay(since, until),
    countUsers(),
    notesPerDay(since, until),
    tasksPerDay(since, until),
    tasksCompletedPerDay(since, until),
    eventsPerDay(since, until),
    aiMessagesPerDay(since, until),
    aiTokensPerDay(since, until),
    rateLimitedPerDay(since, until),
    failedRunsPerDay(since, until),
    aiTokenTotals(since, until),
    aiConversationCount(since, until),
    aiConversationsByModel(),
    activityByEntity(since, until),
    activeUsersPerDay("activity", since, until),
    activeUsersPerDay("login", since, until),
    activeUsersPerDay("ai", since, until),
  ]);

  // Users: per-day signups + running total.
  const newPerDay = fill(keys, userCounts);
  const newTotal = newPerDay.reduce((n, b) => n + b.value, 0);
  let running = totalUsers - newTotal;
  const cumulative = newPerDay.map((b) => {
    running += b.value;
    return { date: b.date, value: running };
  });

  // DAU: union of workspace actors, logins, and AI users per day.
  const dau = keys.map((date) => {
    const union = new Set<string>();
    for (const set of [activitySets.get(date), loginSets.get(date), aiSets.get(date)]) {
      if (set) for (const id of set) union.add(id);
    }
    return { date, value: union.size };
  });
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const [wau, mau] = await Promise.all([
    distinctActiveUsers(weekAgo),
    distinctActiveUsers(monthAgo),
  ]);

  // Content + AI series.
  const sum = (buckets: DayPoint[]): number => buckets.reduce((n, b) => n + b.value, 0);
  const notesCreated = fill(keys, notesCounts);
  const tasksCreated = fill(keys, tasksCounts);
  const tasksCompleted = fill(keys, completedCounts);
  const eventsCreated = fill(keys, eventsCounts);
  const messagesPerDay = fill(keys, messageCounts);
  const tokensPerDay = fill(keys, tokenCounts);
  const errorsPerDay = keys.map((date) => ({
    date,
    value: (rateCounts.get(date) ?? 0) + (failedCounts.get(date) ?? 0),
  }));

  const features = [
    ...featureRows.map((r) => ({ key: r.entity, uses: r.uses })),
    { key: "ai.assistant", uses: tokenTotals.messages },
  ].sort((a, b) => b.uses - a.uses);

  return {
    range: { key, days, since: since.toISOString(), until: until.toISOString() },
    users: { newPerDay, cumulative, total: totalUsers, newTotal },
    activity: {
      dau,
      dauLatest: dau.length ? dau[dau.length - 1].value : 0,
      wau,
      mau,
    },
    content: {
      notesCreated,
      tasksCreated,
      tasksCompleted,
      eventsCreated,
      totals: {
        notes: sum(notesCreated),
        tasks: sum(tasksCreated),
        completed: sum(tasksCompleted),
        events: sum(eventsCreated),
      },
    },
    ai: {
      messagesPerDay,
      tokensPerDay,
      errorsPerDay,
      totals: {
        conversations,
        messages: tokenTotals.messages,
        tokens: tokenTotals.input + tokenTotals.output,
        errors: sum(errorsPerDay),
      },
    },
    features,
  };
}
