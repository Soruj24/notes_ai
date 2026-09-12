"use client";

export type Severity = "info" | "warning" | "critical";
export type Priority = "low" | "normal" | "high" | "urgent";
export type Source = "auth" | "security" | "ai" | "system" | "features" | "settings" | "maintenance";

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  priority: Priority;
  source: Source;
  linkHref?: string;
  read: boolean;
  createdAt: string;
}

export interface InboxFilters {
  q: string;
  severity: string;
  priority: string;
  source: string;
  read: string;
  limit: number;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  q: "",
  severity: "all",
  priority: "all",
  source: "all",
  read: "all",
  limit: 25,
};

function toQuery(f: InboxFilters, offset: number): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.severity !== "all") sp.set("severity", f.severity);
  if (f.priority !== "all") sp.set("priority", f.priority);
  if (f.source !== "all") sp.set("source", f.source);
  if (f.read !== "all") sp.set("read", f.read);
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const json = (await res.json().catch(() => null)) as T & { error?: string; errors?: unknown };
  if (!res.ok) throw new Error(apiErrorMessage(json, `Request failed (${res.status}).`));
  return json as T;
}

export const inboxApi = {
  list: (filters: InboxFilters, offset: number) =>
    request<{ items: InboxItem[]; total: number; unread: number }>(
      `/api/admin/notifications?${toQuery(filters, offset)}`,
    ),
  markRead: (id: string) =>
    request<{ id: string }>(`/api/admin/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<{ updated: number }>(`/api/admin/notifications/read-all`, { method: "POST" }),
};
