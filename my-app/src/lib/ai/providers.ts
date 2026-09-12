import { ChatOpenAI } from "@langchain/openai";
import { matchesDiscovered } from "@/src/lib/ai/settings";

/**
 * Provider abstraction. The application depends on these interfaces —
 * never on one vendor's SDK directly outside the adapters below.
 *
 *   AI Service (agent.ts / complete.ts)
 *     ↓ resolves AIModelConfig via resolveChatModel()
 *   Provider Adapter (OpenAICompatibleAdapter)
 *     ↓ builds the SDK client for the Selected Model
 *   Selected Model
 *
 * Today one adapter covers every OpenAI-compatible endpoint (Ollama,
 * OpenAI, self-hosted gateways) — selected by baseUrl, not by vendor
 * code paths. New vendors add an adapter here; callers stay unchanged.
 */

// ---------------------------------------------------------------------------
// Configuration shapes (stored via the closed ai.* settings registry)
// ---------------------------------------------------------------------------

/** Connection config for one provider. apiKey lives server-side only. */
export interface AIProviderConfig {
  id: string;
  label: string;
  enabled: boolean;
  baseUrl: string;
  /** Write-only secret. Never serialized to API responses. */
  apiKey?: string;
}

/** One model entry: availability, per-model sampling, per-model budgets. */
export interface AIModel {
  name: string;
  providerId: string;
  /** Availability toggle. Disabled models are never selected or offered. */
  enabled: boolean;
  temperature?: number;
  maxTokens?: number;
  /** 0 = inherit the global budget. */
  dailyRequestLimit?: number;
  dailyTokenLimit?: number;
}

/** Fallback target used when the primary provider is unreachable. */
export interface AIFallback {
  providerId: string;
  model: string;
}

/** Fully resolved runtime config for one turn. No secrets leave the server. */
export interface AIModelConfig {
  providerId: string;
  providerLabel: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  isFallback: boolean;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export interface ProviderAdapter {
  readonly id: string;
  readonly label: string;
  ping(timeoutMs?: number): Promise<{ reachable: boolean; latencyMs: number | null }>;
  discoverModels(timeoutMs?: number): Promise<string[]>;
  buildChatModel(model: string, opts: { temperature: number; maxTokens: number; maxRetries: number }): ChatOpenAI;
}

function originOf(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

/** OpenAI-compatible endpoints (Ollama /v1 + /api/tags, OpenAI /v1/models). */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id: string;
  readonly label: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: AIProviderConfig) {
    this.id = config.id;
    this.label = config.label;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey ?? "ollama";
  }

  async ping(timeoutMs = 3000): Promise<{ reachable: boolean; latencyMs: number | null }> {
    const origin = originOf(this.baseUrl);
    if (!origin) return { reachable: false, latencyMs: null };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      // Ollama-native first, OpenAI-compatible fallback.
      const tags = await fetch(`${origin}/api/tags`, { signal: controller.signal });
      if (tags.ok) return { reachable: true, latencyMs: Date.now() - started };
      const models = await fetch(`${origin}/v1/models`, {
        signal: controller.signal,
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      return models.ok
        ? { reachable: true, latencyMs: Date.now() - started }
        : { reachable: false, latencyMs: null };
    } catch {
      return { reachable: false, latencyMs: null };
    } finally {
      clearTimeout(timeout);
    }
  }

  async discoverModels(timeoutMs = 5000): Promise<string[]> {
    const origin = originOf(this.baseUrl);
    if (!origin) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const tags = await fetch(`${origin}/api/tags`, { signal: controller.signal });
      if (tags.ok) {
        const json = (await tags.json()) as { models?: Array<{ name?: string }> };
        const names = (json.models ?? []).map((m) => m.name).filter((n): n is string => typeof n === "string");
        if (names.length) return names;
      }
      const models = await fetch(`${origin}/v1/models`, {
        signal: controller.signal,
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      if (models.ok) {
        const json = (await models.json()) as { data?: Array<{ id?: string }> };
        return (json.data ?? []).map((m) => m.id).filter((n): n is string => typeof n === "string");
      }
    } catch {
      // Unreachable — caller treats empty as "unknown".
    } finally {
      clearTimeout(timeout);
    }
    return [];
  }

  buildChatModel(
    model: string,
    opts: { temperature: number; maxTokens: number; maxRetries: number },
  ): ChatOpenAI {
    return new ChatOpenAI({
      model,
      apiKey: this.apiKey,
      configuration: {
        baseURL: this.baseUrl,
        defaultHeaders: {
          "HTTP-Referer": "https://notoai.app",
          "X-Title": "NotoAI",
        },
      },
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      maxRetries: opts.maxRetries,
    });
  }
}

/** Adapter factory — the only place vendor classes are chosen. */
export function getAdapter(config: AIProviderConfig): ProviderAdapter {
  return new OpenAICompatibleAdapter(config);
}

/** Redacted provider shape safe for API responses (no apiKey). */
export function redactProvider(config: AIProviderConfig): Omit<AIProviderConfig, "apiKey"> & {
  apiKeyConfigured: boolean;
} {
  const { apiKey, ...rest } = config;
  void apiKey;
  return { ...rest, apiKeyConfigured: typeof apiKey === "string" && apiKey.length > 0 };
}

// ---------------------------------------------------------------------------
// Selection: AI Service → Adapter → Selected Model
// ---------------------------------------------------------------------------

/**
 * Resolve the model config for a turn. Default model from the catalog
 * (availability enforced — disabled models throw); per-model sampling
 * and budgets override the globals; when the primary provider is
 * unreachable and a fallback is configured, the fallback is returned
 * with `isFallback` set. Throws when nothing usable resolves.
 */
export async function resolveChatModel(): Promise<AIModelConfig> {
  const { getEffectiveAIConfig } = await import("@/src/lib/ai/config");
  const config = await getEffectiveAIConfig();
  const providers = config.providers.filter((p) => p.enabled);
  if (!providers.length) throw new Error("No AI providers are enabled.");

  const sameModel = (name: string): boolean =>
    name === config.model || matchesDiscovered(config.model, [name]);
  const liveEntry = config.models.find(
    (m) => sameModel(m.name) && m.enabled && providers.some((p) => p.id === m.providerId),
  );
  const disabledEntry = config.models.find((m) => sameModel(m.name) && !m.enabled);
  if (!liveEntry && disabledEntry) {
    throw new Error(`Model ${config.model} is disabled.`);
  }
  const provider = liveEntry
    ? (providers.find((p) => p.id === liveEntry.providerId) as AIProviderConfig)
    : providers[0];

  const build = (model: string, entry: AIModel | undefined, isFallback: boolean): AIModelConfig => ({
    providerId: provider.id,
    providerLabel: provider.label,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey ?? config.apiKey,
    model,
    temperature: entry?.temperature ?? config.temperature,
    maxTokens: entry?.maxTokens ?? config.maxTokens,
    maxRetries: config.maxRetries,
    dailyRequestLimit: entry?.dailyRequestLimit || 0,
    dailyTokenLimit: entry?.dailyTokenLimit || 0,
    isFallback,
  });

  const primary = build(config.model, liveEntry, false);

  // Fast-path: no fallback configured → return primary (failures surface
  // from the provider call itself, as before).
  if (!config.fallback) return primary;

  const fallbackProvider = providers.find((p) => p.id === config.fallback!.providerId);
  if (!fallbackProvider) return primary;
  const adapter = getAdapter(provider);
  const up = await adapter.ping(1500);
  if (up.reachable) return primary;

  const fallbackEntry = config.models.find(
    (m) => m.name === config.fallback!.model && m.providerId === fallbackProvider.id,
  );
  if (fallbackEntry && !fallbackEntry.enabled) {
    throw new Error("Primary provider unreachable and the fallback model is disabled.");
  }
  return {
    providerId: fallbackProvider.id,
    providerLabel: fallbackProvider.label,
    baseUrl: fallbackProvider.baseUrl,
    apiKey: fallbackProvider.apiKey ?? config.apiKey,
    model: config.fallback.model,
    temperature: fallbackEntry?.temperature ?? config.temperature,
    maxTokens: fallbackEntry?.maxTokens ?? config.maxTokens,
    maxRetries: config.maxRetries,
    dailyRequestLimit: fallbackEntry?.dailyRequestLimit || 0,
    dailyTokenLimit: fallbackEntry?.dailyTokenLimit || 0,
    isFallback: true,
  };
}
