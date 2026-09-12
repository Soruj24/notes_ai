import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, ValidationError } from "@/src/lib/db/errors";
import { getEffectiveAIConfig, isAIConfigured } from "@/src/lib/ai/config";
import {
  AI_SETTING_DEFS,
  AI_SETTING_KEYS,
  isAISettingKey,
  matchesDiscovered,
  validateAISettingValue,
  type AISettingKey,
} from "@/src/lib/ai/settings";
import { TOOL_NAMES } from "@/src/lib/ai/tools";
import {
  getAdapter,
  redactProvider,
  type AIFallback,
  type AIModel,
  type AIProviderConfig,
} from "@/src/lib/ai/providers";
import { hasPermission } from "@/src/lib/rbac/roles";
import type { SystemSettingType } from "@/src/lib/db/admin-enums";
import {
  deleteSetting,
  getSetting,
  listSettings,
  upsertSetting,
} from "@/src/repositories/system-setting.repository";
import { listFlags } from "@/src/repositories/feature-flag.repository";
import { countSecurityEvents, listSecurityEvents } from "@/src/repositories/security-event.repository";
import { recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import {
  aiConversationCount,
  aiConversationsByIds,
  aiTokenTotals,
  countAllAiConversations,
  failedRuns,
  failedRunsCount,
} from "@/src/repositories/admin-stats.repository";
import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * AI Control Center backend. Reads need ai.view (route gate); every write
 * re-checks its registry permission here, validates against the closed
 * setting registry (no arbitrary keys/values), redacts secrets, and
 * audits before/after. Secrets never leave the server.
 */

export interface OllamaModel {
  name: string;
  size?: number;
}

async function ollamaOrigin(): Promise<string | null> {
  const config = await getEffectiveAIConfig();
  try {
    return new URL(config.baseUrl).origin;
  } catch {
    return null;
  }
}

async function pingProvider(timeoutMs = 3000): Promise<{ reachable: boolean; latencyMs: number | null }> {
  const origin = await ollamaOrigin();
  if (!origin) return { reachable: false, latencyMs: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${origin}/api/tags`, { signal: controller.signal });
    if (!res.ok) return { reachable: false, latencyMs: null };
    return { reachable: true, latencyMs: Date.now() - started };
  } catch {
    return { reachable: false, latencyMs: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverModels(): Promise<{ reachable: boolean; models: OllamaModel[] }> {
  const origin = await ollamaOrigin();
  if (!origin) return { reachable: false, models: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${origin}/api/tags`, { signal: controller.signal });
    if (!res.ok) return { reachable: false, models: [] };
    const json = (await res.json()) as { models?: Array<{ name?: string; size?: number }> };
    return {
      reachable: true,
      models: (json.models ?? [])
        .filter((m) => typeof m.name === "string")
        .map((m) => ({ name: m.name as string, size: m.size })),
    };
  } catch {
    return { reachable: false, models: [] };
  } finally {
    clearTimeout(timeout);
  }
}

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

export async function getAIOverview(): Promise<AIOverview> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [config, provider, totals, failed, rateLimited, flags, conversations] = await Promise.all([
    getEffectiveAIConfig(),
    pingProvider(),
    aiTokenTotals(),
    failedRunsCount(),
    countSecurityEvents({ type: "rate.limited", since: weekAgo }),
    listFlags().then((all) => all.filter((f) => f.key === "ai.command" || f.key.startsWith("ai.")).length),
    countAllAiConversations(),
  ]);
  return {
    enabled: config.enabled,
    configured: isAIConfigured(),
    providerReachable: provider.reachable,
    activeModel: config.model,
    embeddingProvider: config.embeddingProvider,
    embeddingModel: config.embeddingModel,
    totals: {
      conversations,
      messages: totals.messages,
      inputTokens: totals.input,
      outputTokens: totals.output,
    },
    failedRuns: failed,
    rateLimited7d: rateLimited,
    aiFlags: flags,
  };
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
  /** Configured provider catalog, secrets redacted. */
  providers: Array<Omit<AIProviderConfig, "apiKey"> & { apiKeyConfigured: boolean; reachable: boolean }>;
}

export async function getProviders(): Promise<ProviderInfo> {
  const [config, ping, discovered] = await Promise.all([
    getEffectiveAIConfig(),
    pingProvider(),
    discoverModels(),
  ]);
  const reachability = await Promise.all(
    config.providers.map(async (p) => {
      if (!p.enabled) return { id: p.id, reachable: false };
      try {
        const up = await getAdapter(p).ping(3000);
        return { id: p.id, reachable: up.reachable };
      } catch {
        return { id: p.id, reachable: false };
      }
    }),
  );
  const byId = new Map(reachability.map((r) => [r.id, r.reachable]));
  return {
    reachable: ping.reachable,
    latencyMs: ping.latencyMs,
    baseUrl: config.baseUrl,
    apiKeyConfigured: isAIConfigured(),
    models: discovered.models,
    activeModel: config.model,
    embeddingProvider: config.embeddingProvider,
    embeddingModel: config.embeddingModel,
    embeddingDimensions: config.embeddingProvider === "ollama" ? 1536 : 512,
    providers: config.providers.map((p) => ({
      ...redactProvider(p),
      reachable: byId.get(p.id) ?? false,
    })),
  };
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

/** Union of discovered models and catalog entries with availability markers. */
export async function getModelCatalog(): Promise<{ models: CatalogModel[] }> {
  const config = await getEffectiveAIConfig();
  const enabledProviders = config.providers.filter((p) => p.enabled);
  const discovered = await Promise.all(
    enabledProviders.map(async (p) => {
      try {
        return { provider: p, names: await getAdapter(p).discoverModels() };
      } catch {
        return { provider: p, names: [] as string[] };
      }
    }),
  );
  const entries = new Map(config.models.map((m) => [`${m.providerId}/${m.name}`, m]));
  const out: CatalogModel[] = [];
  const seen = new Set<string>();
  const fallback = config.fallback;
  // Ollama tags `model` as `model:latest` — badges match leniently.
  const isDefaultName = (name: string): boolean =>
    name === config.model || matchesDiscovered(config.model, [name]);
  const isFallbackName = (providerId: string, name: string): boolean =>
    fallback?.providerId === providerId &&
    (fallback.model === name || matchesDiscovered(fallback.model, [name]));
  const push = (
    name: string,
    provider: AIProviderConfig,
    source: "discovered" | "configured",
    entry: AIModel | undefined,
  ) => {
    out.push({
      name,
      providerId: provider.id,
      providerLabel: provider.label,
      source: entry ? "configured" : source,
      enabled: entry ? entry.enabled : true,
      isDefault: isDefaultName(name),
      isFallback: isFallbackName(provider.id, name),
      ...(entry?.temperature !== undefined ? { temperature: entry.temperature } : {}),
      ...(entry?.maxTokens !== undefined ? { maxTokens: entry.maxTokens } : {}),
      ...(entry?.dailyRequestLimit !== undefined ? { dailyRequestLimit: entry.dailyRequestLimit } : {}),
      ...(entry?.dailyTokenLimit !== undefined ? { dailyTokenLimit: entry.dailyTokenLimit } : {}),
    });
  };
  for (const { provider, names } of discovered) {
    for (const name of names) {
      const ref = `${provider.id}/${name}`;
      if (seen.has(ref)) continue;
      seen.add(ref);
      push(name, provider, "discovered", entries.get(ref));
    }
  }
  // Configured entries whose provider is disabled/unreachable still show.
  for (const m of config.models) {
    const ref = `${m.providerId}/${m.name}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    const provider = config.providers.find((p) => p.id === m.providerId);
    push(m.name, provider ?? { id: m.providerId, label: m.providerId, enabled: false, baseUrl: "" }, "configured", m);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { models: out };
}

/** Strip apiKeys from a providers value for responses and audit trails. */
function redactProvidersValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((p) => {
    if (typeof p !== "object" || p === null) return p;
    const { apiKey, ...rest } = p as Record<string, unknown>;
    void apiKey;
    return rest;
  });
}

function redactForAudit(key: AISettingKey, value: unknown): unknown {
  if (key === "ai.providers") return redactProvidersValue(value);
  if (key === "ai.provider.apiKey") return { configured: true };
  return value;
}

/** Discover model names across all enabled providers (strict validation). */
async function discoverAllModels(providers: AIProviderConfig[]): Promise<string[]> {
  const names = new Set<string>();
  await Promise.all(
    providers
      .filter((p) => p.enabled)
      .map(async (p) => {
        try {
          for (const n of await getAdapter(p).discoverModels()) names.add(n);
        } catch {
          // One down provider must not block validation.
        }
      }),
  );
  return [...names];
}

const ENV_SOURCE: Partial<Record<AISettingKey, string>> = {
  "ai.model": "AI_MODEL",
  "ai.provider.baseUrl": "OLLAMA_BASE_URL",
  "ai.provider.apiKey": "OLLAMA_API_KEY",
  "ai.embeddings.provider": "EMBEDDING_PROVIDER",
  "ai.embeddings.model": "EMBEDDING_MODEL",
};

export interface ConfigEntry {
  key: AISettingKey;
  label: string;
  description: string;
  type: string;
  options?: readonly string[];
  /** Absent for secrets — see `secretConfigured`. */
  value?: unknown;
  secretConfigured?: boolean;
  source: "console" | "environment" | "default";
  writePermission: string;
  superadminOnly?: boolean;
}

function storageType(key: AISettingKey): SystemSettingType {
  const t = AI_SETTING_DEFS[key].type;
  if (t === "boolean") return "boolean";
  if (t === "integer" || t === "number") return "number";
  if (t === "stringArray" || t === "json") return "json";
  return "string";
}

/** Effective config for the console: values redacted, sources labeled. */
export async function getConfig(): Promise<{ entries: ConfigEntry[] }> {
  const [rows, effective] = await Promise.all([listSettings("ai"), getEffectiveAIConfig()]);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const effectiveMap = effective as unknown as Record<string, unknown>;
  const fieldFor = (key: AISettingKey): string => {
    switch (key) {
      case "ai.enabled":
        return "enabled";
      case "ai.model":
        return "model";
      case "ai.temperature":
        return "temperature";
      case "ai.maxTokens":
        return "maxTokens";
      case "ai.maxRetries":
        return "maxRetries";
      case "ai.recursionLimit":
        return "recursionLimit";
      case "ai.timeoutMs":
        return "timeoutMs";
      case "ai.provider.baseUrl":
        return "baseUrl";
      case "ai.prompts.system":
        return "systemPrompt";
      case "ai.tools.allowlist":
        return "toolAllowlist";
      case "ai.limits.requestsPerUserPerDay":
        return "requestsPerUserPerDay";
      case "ai.limits.tokensPerUserPerDay":
        return "tokensPerUserPerDay";
      case "ai.embeddings.provider":
        return "embeddingProvider";
      case "ai.embeddings.model":
        return "embeddingModel";
      case "ai.providers":
      case "ai.models":
      case "ai.fallback":
        return "";
      default:
        return "";
    }
  };
  const entries: ConfigEntry[] = AI_SETTING_KEYS.map((key) => {
    const def = AI_SETTING_DEFS[key];
    const row = byKey.get(key);
    const envVar = ENV_SOURCE[key];
    const source: ConfigEntry["source"] = row
      ? "console"
      : envVar && process.env[envVar]
        ? "environment"
        : "default";
    if (def.secret) {
      return {
        key,
        label: def.label,
        description: def.description,
        type: def.type,
        writePermission: def.writePermission,
        superadminOnly: true,
        secretConfigured: Boolean(row) || Boolean(envVar && process.env[envVar]),
        source,
      };
    }
    if (key === "ai.providers") {
      // Secrets inside the catalog are stripped — presence flags only.
      const redacted = Array.isArray(effectiveMap.providers)
        ? (effectiveMap.providers as AIProviderConfig[]).map((p) => redactProvider(p))
        : [];
      return {
        key,
        label: def.label,
        description: def.description,
        type: def.type,
        value: redacted,
        source,
        writePermission: def.writePermission,
      };
    }
    if (key === "ai.models" || key === "ai.fallback") {
      return {
        key,
        label: def.label,
        description: def.description,
        type: def.type,
        value: (effectiveMap[key === "ai.models" ? "models" : "fallback"] as unknown) ?? null,
        source,
        writePermission: def.writePermission,
      };
    }
    return {
      key,
      label: def.label,
      description: def.description,
      type: def.type,
      options: def.options,
      value: effectiveMap[fieldFor(key)] ?? null,
      source,
      writePermission: def.writePermission,
    };
  });
  return { entries };
}

async function auditConfig(
  staff: PlatformUser,
  action: string,
  key: string,
  metadata: Record<string, unknown> | undefined,
  ctx: RequestContext,
): Promise<void> {
  await recordAuditEvent({
    actorId: staff.user.id,
    actorRole: staff.role,
    action,
    resourceType: "ai.config",
    resourceId: key,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

/**
 * Write one setting. Closed registry, per-key permission (kill switch
 * needs ai.disable; secrets need superadmin), validated values, redacted
 * audit. Returns the safe record (secrets: configured flag only).
 */
export async function setConfig(
  staff: PlatformUser,
  key: string,
  value: unknown,
  ctx: RequestContext,
): Promise<{ key: string; secretConfigured?: boolean }> {
  if (!isAISettingKey(key)) {
    throw new ValidationError({ key: ["Unknown setting key."] });
  }
  const def = AI_SETTING_DEFS[key];
  if (!hasPermission(staff.role, def.writePermission)) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  if (def.superadminOnly && staff.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Insufficient permissions.");
  }
  // Cross-key context: model/fallback validation needs the provider
  // catalog (candidate value when providers themselves are written).
  const effective = await getEffectiveAIConfig();
  let candidateProviders: AIProviderConfig[] = effective.providers;
  if (key === "ai.providers" && Array.isArray(value)) {
    candidateProviders = value as AIProviderConfig[];
    // Preserve stored secrets where the write omits apiKey (write-only
    // fields must survive list rewrites that only touch other fields).
    const stored = await getSetting("ai.providers");
    const storedKeys = Array.isArray(stored?.value)
      ? new Map(
          (stored.value as AIProviderConfig[]).map((p) => [p.id, p.apiKey]),
        )
      : new Map<string, string | undefined>();
    for (const entry of candidateProviders) {
      if ((entry.apiKey === undefined || entry.apiKey === "") && storedKeys.get(entry.id)) {
        entry.apiKey = storedKeys.get(entry.id);
      }
      if (entry.apiKey === "") delete entry.apiKey;
    }
    // Safe delete: models/fallback may not reference removed providers.
    const kept = new Set(candidateProviders.map((p) => p.id));
    const [modelsRow, fallbackRow] = await Promise.all([
      getSetting("ai.models"),
      getSetting("ai.fallback"),
    ]);
    const models = Array.isArray(modelsRow?.value) ? (modelsRow.value as AIModel[]) : [];
    const orphan = models.find((m) => !kept.has(m.providerId));
    if (orphan) {
      throw new ValidationError({
        value: [`Provider ${orphan.providerId} still has model entries (${orphan.name}).`],
      });
    }
    const fallback = fallbackRow?.value as AIFallback | null | undefined;
    if (fallback && !kept.has(fallback.providerId)) {
      throw new ValidationError({ value: ["The fallback model uses a removed provider."] });
    }
    value = candidateProviders;
  }
  const providerIds = candidateProviders.map((p) => p.id);
  const extra =
    key === "ai.model" || key === "ai.fallback"
      ? { discoveredModels: await discoverAllModels(candidateProviders), providerIds }
      : key === "ai.models"
        ? { providerIds }
        : key === "ai.tools.allowlist"
          ? { toolNames: TOOL_NAMES }
          : {};
  const { value: clean, errors } = validateAISettingValue(key, value, extra);
  if (errors || clean === undefined) {
    throw new ValidationError({ value: errors?.value ?? ["Invalid value."] });
  }
  const before = await getSetting(key);
  const beforeSafe = def.secret
    ? { configured: Boolean(before) }
    : redactForAudit(key, (before?.value ?? null) as unknown);
  await upsertSetting({
    key,
    value: clean,
    type: storageType(key),
    category: "ai",
    description: def.description,
    isPublic: false,
    isEditable: true,
    updatedBy: staff.user.id,
  });
  const afterSafe = def.secret ? { configured: true } : redactForAudit(key, clean);
  await auditConfig(staff, "AI_CONFIG_UPDATED", key, { before: beforeSafe, after: afterSafe }, ctx);
  return def.secret ? { key, secretConfigured: true } : { key };
}

/** Reset one setting (delete the override row). Audited. */
export async function resetConfig(
  staff: PlatformUser,
  key: string,
  ctx: RequestContext,
): Promise<{ key: string; reset: boolean }> {
  if (!isAISettingKey(key)) {
    throw new ValidationError({ key: ["Unknown setting key."] });
  }
  const def = AI_SETTING_DEFS[key];
  if (!hasPermission(staff.role, def.writePermission)) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  if (def.superadminOnly && staff.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Insufficient permissions.");
  }
  const before = await getSetting(key);
  const removed = await deleteSetting(key);
  if (removed) {
    await auditConfig(
      staff,
      "AI_CONFIG_RESET",
      key,
      {
        before: def.secret
          ? { configured: true }
          : redactForAudit(key, (before?.value ?? null) as unknown),
      },
      ctx,
    );
  }
  return { key, reset: removed };
}

export interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
}

/** Registry tools with descriptions + effective enabled flags (no secrets). */
export async function getTools(): Promise<{ tools: ToolInfo[]; allowlist: string[] | null }> {
  const { makeTools } = await import("@/src/lib/ai/tools");
  const config = await getEffectiveAIConfig();
  const all = makeTools({ userId: "", workspaceId: "" });
  const enabled = new Set(config.toolAllowlist ?? TOOL_NAMES);
  return {
    tools: all.map((t) => ({
      name: t.name,
      description: (t.description ?? "") as string,
      enabled: enabled.has(t.name),
    })),
    allowlist: config.toolAllowlist,
  };
}

/** Replace the tool allowlist (subset of registry). Audited. */
export async function setTools(
  staff: PlatformUser,
  allowlist: unknown,
  ctx: RequestContext,
): Promise<{ allowlist: string[] }> {
  if (!hasPermission(staff.role, "ai.configure")) {
    throw new ForbiddenError("Insufficient permissions.");
  }
  const { value, errors } = validateAISettingValue("ai.tools.allowlist", allowlist, {
    toolNames: TOOL_NAMES,
  });
  if (errors || !Array.isArray(value)) {
    throw new ValidationError({ value: errors?.value ?? ["Invalid tool list."] });
  }
  const before = await getSetting("ai.tools.allowlist");
  await upsertSetting({
    key: "ai.tools.allowlist",
    value,
    type: "json",
    category: "ai",
    description: AI_SETTING_DEFS["ai.tools.allowlist"].description,
    isPublic: false,
    isEditable: true,
    updatedBy: staff.user.id,
  });
  await auditConfig(staff, "AI_TOOLS_UPDATED", "ai.tools.allowlist", { before: before?.value ?? null, after: value }, ctx);
  return { allowlist: value as string[] };
}

export interface FailedRun {
  conversationId: string;
  title: string;
  model?: string;
  at: string;
}

export interface AIErrorOverview {
  provider: { reachable: boolean; latencyMs: number | null };
  failedRuns: FailedRun[];
  failedRunsTotal: number;
  rateLimited: Array<{ id: string; email?: string; ipAddress?: string; createdAt: string }>;
  rateLimited7d: number;
}

export async function getErrors(): Promise<AIErrorOverview> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [provider, failed, rateLimited, failedRunsTotal, rateLimited7d] = await Promise.all([
    pingProvider(),
    failedRuns(10),
    listSecurityEvents({ type: "rate.limited", limit: 10 }),
    failedRunsCount(),
    countSecurityEvents({ type: "rate.limited", since: weekAgo }),
  ]);
  const conversations = await aiConversationsByIds([...new Set(failed.map((f) => f.conversationId))]);
  const byId = new Map(conversations.map((c) => [c.id, c]));
  return {
    provider,
    failedRuns: failed.map((f) => {
      const c = byId.get(f.conversationId);
      return {
        conversationId: f.conversationId,
        title: c?.title ?? "(deleted conversation)",
        model: c?.model,
        at: f.at.toISOString(),
      };
    }),
    failedRunsTotal,
    rateLimited: rateLimited.map((e) => ({
      id: e.id,
      email: e.email,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt.toISOString(),
    })),
    rateLimited7d,
  };
}
