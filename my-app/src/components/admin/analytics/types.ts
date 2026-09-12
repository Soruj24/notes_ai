"use client";

export interface DayPoint {
  date: string;
  value: number;
}

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

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

export function rangeQuery(range: RangeKey, since: string, until: string): string {
  const sp = new URLSearchParams({ range });
  if (range === "custom") {
    if (since) sp.set("since", since);
    if (until) sp.set("until", until);
  }
  return sp.toString();
}

export async function fetchAnalytics(range: RangeKey, since: string, until: string): Promise<AdminAnalytics> {
  const res = await fetch(`/api/admin/analytics?${rangeQuery(range, since, until)}`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as AdminAnalytics & { error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json as AdminAnalytics;
}
