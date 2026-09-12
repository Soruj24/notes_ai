import { pingDb } from "@/src/lib/db/connection";
import {
  activityPerDay,
  aiConversationCount,
  aiConversationsByModel,
  aiMessagesPerDay,
  aiTokenTotals,
  aiTokensPerDay,
  countAllAiConversations,
  countAllAiMessages,
  countAllNotes,
  countAllTasks,
  countDoneTasks,
  notesPerDay,
  recentUsers,
  tasksCompletedPerDay,
  tasksPerDay,
  usersPerDay,
} from "@/src/repositories/admin-stats.repository";
import { listAuditEvents } from "@/src/repositories/admin-audit-log.repository";
import { countSecurityEvents, listSecurityEvents } from "@/src/repositories/security-event.repository";
import { listFlags } from "@/src/repositories/feature-flag.repository";
import { countAllWorkspaces } from "@/src/repositories/workspace.repository";
import { countNewUsers, countUsers, countUsersByStatus } from "@/src/repositories/user.repository";
import type { HealthCheck } from "@/src/services/admin/overview.service";

/**
 * Admin dashboard data layer. Every number derives from live MongoDB
 * queries — no mock data. Read-only; safe to call on each dashboard visit.
 *
 * Definitions:
 * - activeUsers: accounts with status ACTIVE (only ACTIVE authenticates).
 * - newUsers: accounts created in the trailing window (default 7 days).
 * - suspendedUsers: accounts with status SUSPENDED.
 * - aiRequests: total stored AI messages (user + assistant turns).
 * - aiErrors: rate-limited requests observed in the security event stream
 *   (the only persisted error signal; the dedicated AI error log is a
 *   roadmap item, so the source is labeled in the API response).
 */

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  newUsersWindowDays: number;
  suspendedUsers: number;
  totalWorkspaces: number;
  totalNotes: number;
  totalTasks: number;
  completedTasks: number;
  aiRequests: number;
  aiErrors: number;
  aiErrorsSource: string;
}

export interface DayBucket {
  date: string;
  value: number;
}

export interface UserGrowth {
  days: number;
  perDay: DayBucket[];
  cumulative: DayBucket[];
}

export interface ActivityOverview {
  days: number;
  tasksCreated: DayBucket[];
  tasksCompleted: DayBucket[];
  notesCreated: DayBucket[];
  activityEvents: DayBucket[];
  totals: {
    tasksCreated: number;
    tasksCompleted: number;
    notesCreated: number;
    activityEvents: number;
  };
}

export interface AiUsage {
  days: number;
  messagesPerDay: DayBucket[];
  tokensPerDay: DayBucket[];
  totals: {
    conversations: number;
    messages: number;
    inputTokens: number;
    outputTokens: number;
  };
  byModel: Array<{ model: string; conversations: number }>;
}

export interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface RecentAdminAction {
  id: string;
  action: string;
  actorId: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: string;
}

export interface SecurityAlert {
  id: string;
  type: string;
  email?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SecurityOverview {
  alerts: SecurityAlert[];
  failedLoginsLast7d: number;
  deniedLast7d: number;
}

export interface FeatureStatus {
  total: number;
  enabled: number;
  disabled: number;
  flags: Array<{ key: string; name: string; enabled: boolean; environment: string }>;
}

const DAY_MS = 86_400_000;

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function lastNDayKeys(days: number, now: Date): string[] {
  const keys: string[] = [];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(start.getTime() - i * DAY_MS)));
  }
  return keys;
}

function fillBuckets(keys: string[], counts: Map<string, number>): DayBucket[] {
  return keys.map((date) => ({ date, value: counts.get(date) ?? 0 }));
}

function windowSince(days: number, now: Date): { since: Date; keys: string[] } {
  const keys = lastNDayKeys(days, now);
  const since = new Date(new Date(`${keys[0]}T00:00:00Z`).getTime());
  return { since, keys };
}

export async function getDashboardMetrics(newUsersWindowDays = 7): Promise<DashboardMetrics> {
  const days = Math.min(Math.max(Math.floor(newUsersWindowDays) || 7, 1), 90);
  const since = new Date(Date.now() - days * DAY_MS);
  const [
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalWorkspaces,
    totalNotes,
    totalTasks,
    completedTasks,
    aiRequests,
    aiErrors,
  ] = await Promise.all([
    countUsers(),
    countUsersByStatus("ACTIVE"),
    countNewUsers(since),
    countUsersByStatus("SUSPENDED"),
    countAllWorkspaces(),
    countAllNotes(),
    countAllTasks(),
    countDoneTasks(),
    countAllAiMessages(),
    countSecurityEvents({ type: "rate.limited" }),
  ]);
  return {
    totalUsers,
    activeUsers,
    newUsers,
    newUsersWindowDays,
    suspendedUsers,
    totalWorkspaces,
    totalNotes,
    totalTasks,
    completedTasks,
    aiRequests,
    aiErrors,
    aiErrorsSource: "security events (rate.limited)",
  };
}

export async function getUserGrowth(days = 30, now = new Date()): Promise<UserGrowth> {
  const clamped = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
  const { since, keys } = windowSince(clamped, now);
  const until = new Date(keys.length ? new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime() + DAY_MS - 1 : since.getTime());
  const [counts, totalUsers] = await Promise.all([
    usersPerDay(since, until),
    countUsers(),
  ]);
  const perDay = fillBuckets(keys, counts);
  const inWindow = perDay.reduce((n, b) => n + b.value, 0);
  let running = totalUsers - inWindow;
  const cumulative = perDay.map((b) => {
    running += b.value;
    return { date: b.date, value: running };
  });
  return { days: clamped, perDay, cumulative };
}

export async function getActivityOverview(days = 30, now = new Date()): Promise<ActivityOverview> {
  const clamped = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
  const { since, keys } = windowSince(clamped, now);
  const until = new Date(keys.length ? new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime() + DAY_MS - 1 : since.getTime());
  const [tasksCreatedCounts, notesCreatedCounts, activityCounts, completedCounts] = await Promise.all([
    tasksPerDay(since, until),
    notesPerDay(since, until),
    activityPerDay(since, until),
    tasksCompletedPerDay(since, until),
  ]);
  const tasksCreated = fillBuckets(keys, tasksCreatedCounts);
  const tasksCompleted = fillBuckets(keys, completedCounts);
  const notesCreated = fillBuckets(keys, notesCreatedCounts);
  const activityEvents = fillBuckets(keys, activityCounts);
  const sum = (buckets: DayBucket[]): number => buckets.reduce((n, b) => n + b.value, 0);
  return {
    days: clamped,
    tasksCreated,
    tasksCompleted,
    notesCreated,
    activityEvents,
    totals: {
      tasksCreated: sum(tasksCreated),
      tasksCompleted: sum(tasksCompleted),
      notesCreated: sum(notesCreated),
      activityEvents: sum(activityEvents),
    },
  };
}

export async function getAiUsage(days = 30, now = new Date()): Promise<AiUsage> {
  const clamped = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
  const { since, keys } = windowSince(clamped, now);
  const until = new Date(keys.length ? new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime() + DAY_MS - 1 : since.getTime());
  const [messageCounts, tokenCounts, totals, byModelRows, conversations] = await Promise.all([
    aiMessagesPerDay(since, until),
    aiTokensPerDay(since, until),
    aiTokenTotals(),
    aiConversationsByModel(),
    countAllAiConversations(),
  ]);
  const messagesPerDay = fillBuckets(keys, messageCounts);
  const tokensPerDay = fillBuckets(keys, tokenCounts);
  return {
    days: clamped,
    messagesPerDay,
    tokensPerDay,
    totals: {
      conversations,
      messages: totals.messages,
      inputTokens: totals.input,
      outputTokens: totals.output,
    },
    byModel: byModelRows.map((r) => ({ model: r.model, conversations: r.conversations })),
  };
}

export async function getRecentRegistrations(limit = 8): Promise<RecentRegistration[]> {
  const rows = await recentUsers(limit);
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getRecentAdminActions(limit = 8): Promise<RecentAdminAction[]> {
  const n = Math.min(Math.max(Math.floor(limit) || 8, 1), 25);
  const rows = await listAuditEvents({ limit: n });
  return rows.map((a) => ({
    id: a.id,
    action: a.action,
    actorId: a.actorId,
    resourceType: a.resourceType,
    resourceId: a.resourceId,
    timestamp: a.timestamp.toISOString(),
  }));
}

export async function getSecurityOverview(limit = 10): Promise<SecurityOverview> {
  const n = Math.min(Math.max(Math.floor(limit) || 10, 1), 25);
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const [rows, failedLoginsLast7d, deniedLast7d] = await Promise.all([
    listSecurityEvents({ limit: n }),
    countSecurityEvents({ type: "login.failed", since: weekAgo }),
    countSecurityEvents({ type: "permission.denied", since: weekAgo }),
  ]);
  return {
    alerts: rows.map((e) => ({
      id: e.id,
      type: e.type,
      email: e.email,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt.toISOString(),
    })),
    failedLoginsLast7d,
    deniedLast7d,
  };
}

async function checkOllama(): Promise<HealthCheck> {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  let origin: string;
  try {
    origin = new URL(base).origin;
  } catch {
    return { name: "AI provider (Ollama)", status: "down", detail: "Invalid OLLAMA_BASE_URL." };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${origin}/api/tags`, { signal: controller.signal });
    if (!res.ok) return { name: "AI provider (Ollama)", status: "down", detail: `HTTP ${res.status}.` };
    const json = (await res.json()) as { models?: Array<{ name?: string }> };
    const count = json.models?.length ?? 0;
    return {
      name: "AI provider (Ollama)",
      status: "ok",
      detail: `${count} model${count === 1 ? "" : "s"} available. Embeddings: ${process.env.EMBEDDING_PROVIDER || "hash"}.`,
    };
  } catch {
    return { name: "AI provider (Ollama)", status: "down", detail: "Unreachable." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDashboardHealth(): Promise<{ status: string; checks: HealthCheck[] }> {
  const [dbPing, ollama] = await Promise.all([
    pingDb().then(
      (r) =>
        ({
          name: "Database (MongoDB)",
          status: r.ok ? "ok" : "down",
          detail: r.ok ? "Reachable." : "Unreachable.",
        }) as HealthCheck,
    ),
    checkOllama(),
  ]);
  const socketEnabled = process.env.SOCKET_ENABLED !== "0";
  const checks: HealthCheck[] = [
    dbPing,
    ollama,
    socketEnabled
      ? { name: "Realtime (Socket.IO)", status: "ok", detail: `Port ${process.env.SOCKET_PORT || "3001"}.` }
      : { name: "Realtime (Socket.IO)", status: "disabled", detail: "SOCKET_ENABLED=0." },
    process.env.CRON_SECRET
      ? { name: "Reminder cron", status: "ok", detail: "CRON_SECRET configured." }
      : { name: "Reminder cron", status: "degraded", detail: "CRON_SECRET missing (dev fallback active)." },
  ];
  const status = checks.some((c) => c.status === "down")
    ? "Degraded"
    : checks.some((c) => c.status === "degraded")
      ? "Degraded"
      : "Operational";
  return { status, checks };
}

export async function getFeatureStatus(): Promise<FeatureStatus> {
  const rows = await listFlags();
  const flags = rows.map((f) => ({
    key: f.key,
    name: f.name,
    enabled: f.enabled,
    environment: f.environment,
  }));
  return {
    total: flags.length,
    enabled: flags.filter((f) => f.enabled).length,
    disabled: flags.filter((f) => !f.enabled).length,
    flags,
  };
}
