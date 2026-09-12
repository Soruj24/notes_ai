/**
 * Layered AI configuration: environment defaults overlaid by admin-managed
 * `ai.*` system settings (see `src/lib/ai/settings.ts`). The overlay never
 * throws — invalid stored values fall back to defaults so a bad row can
 * never wedge the assistant. Secrets resolve server-side only.
 */

import { TOOL_NAMES } from "@/src/lib/ai/tools";
import { validateAISettingValue, type AISettingKey } from "@/src/lib/ai/settings";
import type { AIFallback, AIModel, AIProviderConfig } from "@/src/lib/ai/providers";

const OLLAMA_BASE_URL = "http://localhost:11434/v1";

export interface AIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.OLLAMA_API_KEY ?? "ollama";
  if (!apiKey) {
    throw new Error(
      "OLLAMA_API_KEY is not set. Add it to .env.local to enable the AI Command Center.",
    );
  }
  return {
    apiKey,
    model: process.env.AI_MODEL || "gemma4",
    baseUrl: process.env.OLLAMA_BASE_URL || OLLAMA_BASE_URL,
  };
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY);
}

export interface EffectiveAIConfig extends AIConfig {
  enabled: boolean;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
  recursionLimit: number;
  timeoutMs: number;
  /** Null = built-in default prompt. */
  systemPrompt: string | null;
  /** Null = all registry tools enabled. */
  toolAllowlist: string[] | null;
  requestsPerUserPerDay: number;
  tokensPerUserPerDay: number;
  embeddingProvider: "hash" | "ollama";
  embeddingModel: string;
  /**
   * Provider catalog (WITH secrets — server-side only, never serialized).
   * Empty catalog synthesizes one provider from env + legacy overrides.
   */
  providers: AIProviderConfig[];
  /** Model catalog entries (availability + per-model overrides). */
  models: AIModel[];
  /** Fallback target when the primary provider is unreachable. */
  fallback: AIFallback | null;
}

const DEFAULTS: Omit<EffectiveAIConfig, "apiKey" | "model" | "baseUrl" | "providers"> = {
  enabled: true,
  temperature: 0.3,
  maxTokens: 1000,
  maxRetries: 1,
  recursionLimit: 15,
  timeoutMs: 45_000,
  systemPrompt: null,
  toolAllowlist: null,
  requestsPerUserPerDay: 0,
  tokensPerUserPerDay: 0,
  embeddingProvider: (process.env.EMBEDDING_PROVIDER === "ollama" ? "ollama" : "hash") as "hash" | "ollama",
  embeddingModel: process.env.EMBEDDING_MODEL || "nomic-embed-text",
  models: [],
  fallback: null,
};

/** Lenient overlay: validated stored values win, anything else falls back. */
function overlay(stored: Map<string, unknown>): EffectiveAIConfig {
  const base = getAIConfig();
  const pick = (key: AISettingKey): unknown =>
    stored.has(key) ? stored.get(key) : undefined;

  const valid = (key: AISettingKey, raw: unknown): unknown | undefined => {
    if (raw === undefined) return undefined;
    const result = validateAISettingValue(key, raw, { toolNames: TOOL_NAMES });
    return result.value;
  };

  const str = (key: AISettingKey, fallback: string): string => {
    const v = valid(key, pick(key));
    return typeof v === "string" ? v : fallback;
  };
  const num = (key: AISettingKey, fallback: number): number => {
    const v = valid(key, pick(key));
    return typeof v === "number" ? v : fallback;
  };
  const bool = (key: AISettingKey, fallback: boolean): boolean => {
    const v = valid(key, pick(key));
    return typeof v === "boolean" ? v : fallback;
  };

  const promptRaw = valid("ai.prompts.system", pick("ai.prompts.system"));
  const allowRaw = valid("ai.tools.allowlist", pick("ai.tools.allowlist"));
  const embRaw = valid("ai.embeddings.provider", pick("ai.embeddings.provider"));
  const providersRaw = valid("ai.providers", pick("ai.providers"));
  const modelsRaw = valid("ai.models", pick("ai.models"));
  const fallbackRaw = valid("ai.fallback", pick("ai.fallback"));

  const apiKey = str("ai.provider.apiKey", base.apiKey);
  const baseUrl = str("ai.provider.baseUrl", base.baseUrl);
  const providers: AIProviderConfig[] = Array.isArray(providersRaw) && providersRaw.length > 0
    ? (providersRaw as AIProviderConfig[])
    : [{ id: "default", label: "Default (environment)", enabled: true, baseUrl, apiKey }];
  const models: AIModel[] = Array.isArray(modelsRaw) ? (modelsRaw as AIModel[]) : [];
  const fallback: AIFallback | null =
    fallbackRaw !== undefined && fallbackRaw !== null ? (fallbackRaw as AIFallback) : null;

  return {
    apiKey,
    model: str("ai.model", base.model),
    baseUrl,
    enabled: bool("ai.enabled", DEFAULTS.enabled),
    temperature: num("ai.temperature", DEFAULTS.temperature),
    maxTokens: num("ai.maxTokens", DEFAULTS.maxTokens),
    maxRetries: num("ai.maxRetries", DEFAULTS.maxRetries),
    recursionLimit: num("ai.recursionLimit", DEFAULTS.recursionLimit),
    timeoutMs: num("ai.timeoutMs", DEFAULTS.timeoutMs),
    systemPrompt:
      typeof promptRaw === "string" && promptRaw.length > 0 ? promptRaw : DEFAULTS.systemPrompt,
    toolAllowlist: Array.isArray(allowRaw) ? (allowRaw as string[]) : DEFAULTS.toolAllowlist,
    requestsPerUserPerDay: num("ai.limits.requestsPerUserPerDay", DEFAULTS.requestsPerUserPerDay),
    tokensPerUserPerDay: num("ai.limits.tokensPerUserPerDay", DEFAULTS.tokensPerUserPerDay),
    embeddingProvider:
      embRaw === "hash" || embRaw === "ollama" ? embRaw : DEFAULTS.embeddingProvider,
    embeddingModel: str("ai.embeddings.model", DEFAULTS.embeddingModel),
    providers,
    models,
    fallback,
  };
}

/** Merged env + admin settings. One indexed query; no cache (always fresh). */
export async function getEffectiveAIConfig(): Promise<EffectiveAIConfig> {
  try {
    const { listSettings } = await import("@/src/repositories/system-setting.repository");
    const rows = await listSettings("ai");
    const stored = new Map(rows.map((r) => [r.key, r.value as unknown]));
    return overlay(stored);
  } catch {
    // Settings store unreachable: env-only operation (fail operational).
    const base = getAIConfig();
    return {
      ...DEFAULTS,
      ...base,
      providers: [{ id: "default", label: "Default (environment)", enabled: true, baseUrl: base.baseUrl, apiKey: base.apiKey }],
    };
  }
}

/** Kill-switch state (defaults on when unset). */
export async function isAIEnabled(): Promise<boolean> {
  try {
    const { getSetting } = await import("@/src/repositories/system-setting.repository");
    const row = await getSetting("ai.enabled");
    return row && typeof row.value === "boolean" ? (row.value as boolean) : true;
  } catch {
    return true;
  }
}
