"use client";

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityEventView {
  id: string;
  type: string;
  email?: string;
  ipAddress?: string;
  severity: SecuritySeverity;
  createdAt: string;
}

export interface SecurityEventDetail extends SecurityEventView {
  userAgent?: string;
  metadata: Record<string, unknown> | null;
  user: { id: string; name: string; email: string; status: string } | null;
}

export interface SecurityOverview {
  failedLogins24h: number;
  failedLogins7d: number;
  suspiciousTotal: number;
  criticalUnhandled: number;
  rateLimited24h: number;
  rateLimited7d: number;
  denied7d: number;
  sessionsRevoked7d: number;
  sessionsActive: number;
}

export interface AdminActionView {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  result: string;
  timestamp: string;
}

export interface SecurityFilterState {
  q: string;
  /** Single type, "__session" preset, or "all". */
  type: string;
  severity: string;
  since: string;
  until: string;
  limit: number;
}

export const DEFAULT_SECURITY_FILTERS: SecurityFilterState = {
  q: "",
  type: "all",
  severity: "all",
  since: "",
  until: "",
  limit: 25,
};

export const SESSION_ACTIVITY_TYPES = ["login.succeeded", "session.revoked", "password.changed"];

function toQuery(f: SecurityFilterState, offset: number): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.type === "__session") sp.set("types", SESSION_ACTIVITY_TYPES.join(","));
  else if (f.type !== "all") sp.set("type", f.type);
  if (f.severity !== "all") sp.set("severity", f.severity);
  if (f.since) sp.set("since", f.since);
  if (f.until) sp.set("until", f.until);
  sp.set("limit", String(f.limit));
  sp.set("offset", String(offset));
  return sp.toString();
}

export function apiErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const j = json as { error?: unknown; errors?: unknown };
    if (typeof j.error === "string") return j.error;
    if (j.errors && typeof j.errors === "object") {
      const first = Object.values(j.errors as Record<string, unknown>).flat().find((v) => typeof v === "string");
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json as T;
}

export async function fetchSecurityOverview(): Promise<SecurityOverview> {
  return get<SecurityOverview>("/api/admin/security/overview");
}

export async function fetchSecurityEvents(
  filters: SecurityFilterState,
  offset: number,
): Promise<{ events: SecurityEventView[]; total: number }> {
  const json = await get<{ events?: SecurityEventView[]; total?: number }>(
    `/api/admin/security/events?${toQuery(filters, offset)}`,
  );
  return { events: json.events ?? [], total: json.total ?? 0 };
}

export async function fetchSecurityEventDetail(id: string): Promise<SecurityEventDetail> {
  const json = await get<{ event?: SecurityEventDetail }>(`/api/admin/security/events/${id}`);
  if (!json.event) throw new Error("Security event not found.");
  return json.event;
}

export async function fetchAdminActions(): Promise<AdminActionView[]> {
  const json = await get<{ actions?: AdminActionView[] }>("/api/admin/security/admin-actions");
  return json.actions ?? [];
}
