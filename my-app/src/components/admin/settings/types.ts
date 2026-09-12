"use client";

export interface SettingEntry {
  key: string;
  label: string;
  description: string;
  category: string;
  type: string;
  options?: readonly string[];
  value: string | number | boolean;
  source: "console" | "environment" | "default";
  permission: string;
  superadminOnly?: boolean;
  updatedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  key: string;
  action: string;
  actorId: string;
  actorRole?: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
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

export const settingsApi = {
  list: () => request<{ entries: SettingEntry[] }>("/api/admin/settings"),
  history: () => request<{ history: HistoryEntry[] }>("/api/admin/settings/history"),
  save: (key: string, value: unknown) =>
    request<{ key: string }>(`/api/admin/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    }),
  reset: (key: string) =>
    request<{ key: string; reset: boolean }>(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    }),
};
