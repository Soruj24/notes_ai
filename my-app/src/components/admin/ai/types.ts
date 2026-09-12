"use client";

export interface AIOverview {
  enabled: boolean;
  configured: boolean;
  providerReachable: boolean;
  activeModel: string;
  embeddingProvider: string;
  embeddingModel: string;
  totals: { conversations: number; messages: number; inputTokens: number; outputTokens: number };
  failedRuns: number;
  rateLimited7d: number;
  aiFlags: number;
}

export interface OllamaModel {
  name: string;
  size?: number;
}

export interface ProviderEntry {
  id: string;
  label: string;
  enabled: boolean;
  baseUrl: string;
  apiKeyConfigured: boolean;
  reachable: boolean;
}

export interface ProviderInfo {
  reachable: boolean;
  latencyMs: number | null;
  baseUrl: string;
  apiKeyConfigured: boolean;
  models: OllamaModel[];
  activeModel: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  providers: ProviderEntry[];
}

export interface CatalogModel {
  name: string;
  providerId: string;
  providerLabel: string;
  source: "discovered" | "configured";
  enabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  temperature?: number;
  maxTokens?: number;
  dailyRequestLimit?: number;
  dailyTokenLimit?: number;
}

export interface ConfigEntry {
  key: string;
  label: string;
  description: string;
  type: string;
  options?: readonly string[];
  value?: unknown;
  secretConfigured?: boolean;
  source: "console" | "environment" | "default";
  writePermission: string;
  superadminOnly?: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AiUsage {
  days: number;
  messagesPerDay: Array<{ date: string; value: number }>;
  tokensPerDay: Array<{ date: string; value: number }>;
  totals: { conversations: number; messages: number; inputTokens: number; outputTokens: number };
  byModel: Array<{ model: string; conversations: number }>;
}

export interface AIErrorOverview {
  provider: { reachable: boolean; latencyMs: number | null };
  failedRuns: Array<{ conversationId: string; title: string; model?: string; at: string }>;
  failedRunsTotal: number;
  rateLimited: Array<{ id: string; email?: string; ipAddress?: string; createdAt: string }>;
  rateLimited7d: number;
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

export const aiApi = {
  overview: () => request<AIOverview>("/api/admin/ai/overview"),
  providers: () => request<ProviderInfo>("/api/admin/ai/providers"),
  config: () => request<{ entries: ConfigEntry[] }>("/api/admin/ai/config"),
  setConfig: (key: string, value: unknown) =>
    request<{ key: string }>(`/api/admin/ai/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    }),
  resetConfig: (key: string) =>
    request<{ key: string; reset: boolean }>(`/api/admin/ai/config?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    }),
  tools: () => request<{ tools: ToolInfo[]; allowlist: string[] | null }>("/api/admin/ai/tools"),
  setTools: (allowlist: string[]) =>
    request<{ allowlist: string[] }>(`/api/admin/ai/tools`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ allowlist }),
    }),
  usage: (days: number) => request<AiUsage>(`/api/admin/ai/usage?days=${days}`),
  errors: () => request<AIErrorOverview>("/api/admin/ai/errors"),
  models: () => request<{ models: CatalogModel[] }>("/api/admin/ai/models"),
};
