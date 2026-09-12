import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Closed AI settings registry. ONLY these keys are writable through the
 * admin console — unknown keys are rejected, so configuration can never
 * smuggle arbitrary executable semantics into the runtime.
 *
 * Safety contract per key:
 * - Every value is type/range/enum validated before storage; invalid
 *   stored values fall back to defaults in the request path (never throw).
 * - `ai.provider.apiKey` is secret: write-only, superadmin-only, never
 *   serialized (the API reports `{ configured: boolean }` only).
 * - `ai.prompts.system` is plain text data (length-capped). It is passed
 *   as the agent's systemPrompt string and never evaluated, templated,
 *   or executed — prompt text cannot become code.
 * - `ai.tools.allowlist` selects from the fixed TOOL_NAMES set compiled
 *   into `tools.ts`. Unknown names are rejected; tools themselves are
 *   code, the setting only toggles.
 * - `ai.model` / `ai.embeddings.model` accept discovered provider models
 *   or a strict safe pattern (no whitespace, quotes, or shell chars) —
 *   model names are inert strings sent to the provider.
 * - `ai.provider.baseUrl` must parse as http(s) — no exotic schemes.
 */

export const AI_SETTING_KEYS = [
  "ai.enabled",
  "ai.model",
  "ai.fallback",
  "ai.temperature",
  "ai.maxTokens",
  "ai.maxRetries",
  "ai.recursionLimit",
  "ai.timeoutMs",
  "ai.providers",
  "ai.models",
  "ai.provider.baseUrl",
  "ai.provider.apiKey",
  "ai.prompts.system",
  "ai.tools.allowlist",
  "ai.limits.requestsPerUserPerDay",
  "ai.limits.tokensPerUserPerDay",
  "ai.embeddings.provider",
  "ai.embeddings.model",
] as const;

export type AISettingKey = (typeof AI_SETTING_KEYS)[number];

export type AISettingType = "boolean" | "string" | "integer" | "number" | "stringArray" | "enum" | "json";

export interface AISettingDef {
  key: AISettingKey;
  label: string;
  description: string;
  type: AISettingType;
  /** Values outside the enum are rejected (enum type only). */
  options?: readonly string[];
  /** Permission guarding writes. Reads need ai.view. */
  writePermission: Permission;
  /** Secret keys are superadmin-only and never returned. */
  secret?: boolean;
  superadminOnly?: boolean;
}

export const AI_SETTING_DEFS: Record<AISettingKey, AISettingDef> = {
  "ai.enabled": {
    key: "ai.enabled",
    label: "AI enabled (kill switch)",
    description: "Master switch. When off, the assistant command returns 503.",
    type: "boolean",
    writePermission: "ai.disable",
  },
  "ai.model": {
    key: "ai.model",
    label: "Default chat model",
    description: "Validated against discovered models across enabled providers when reachable.",
    type: "string",
    writePermission: "ai.configure",
  },
  "ai.fallback": {
    key: "ai.fallback",
    label: "Fallback model",
    description: "Used when the primary provider is unreachable. Null = no fallback.",
    type: "json",
    writePermission: "ai.configure",
  },
  "ai.temperature": {
    key: "ai.temperature",
    label: "Temperature",
    description: "Sampling temperature, 0 (deterministic) to 2 (creative).",
    type: "number",
    writePermission: "ai.configure",
  },
  "ai.maxTokens": {
    key: "ai.maxTokens",
    label: "Max tokens",
    description: "Per-turn response budget, 1 to 8000.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.maxRetries": {
    key: "ai.maxRetries",
    label: "Max retries",
    description: "Provider retries per call, 0 to 3.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.recursionLimit": {
    key: "ai.recursionLimit",
    label: "Agent recursion limit",
    description: "Max agent steps per turn, 1 to 25.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.timeoutMs": {
    key: "ai.timeoutMs",
    label: "Turn timeout (ms)",
    description: "Abort a turn after 10s to 120s.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.providers": {
    key: "ai.providers",
    label: "Providers",
    description: "Provider catalog. Secrets inside are write-only and redacted everywhere.",
    type: "json",
    writePermission: "ai.configure",
  },
  "ai.models": {
    key: "ai.models",
    label: "Model catalog",
    description: "Availability, per-model sampling, and per-model budgets.",
    type: "json",
    writePermission: "ai.configure",
  },
  "ai.provider.baseUrl": {
    key: "ai.provider.baseUrl",
    label: "Provider base URL",
    description: "Legacy default endpoint (used when no providers are configured). http(s) only.",
    type: "string",
    writePermission: "ai.configure",
  },
  "ai.provider.apiKey": {
    key: "ai.provider.apiKey",
    label: "Provider API key",
    description: "Write-only. Stored server-side, never displayed.",
    type: "string",
    writePermission: "ai.configure",
    secret: true,
    superadminOnly: true,
  },
  "ai.prompts.system": {
    key: "ai.prompts.system",
    label: "System prompt override",
    description: "Plain text (max 8000 chars). Empty = built-in default. Never executed as code.",
    type: "string",
    writePermission: "ai.configure",
  },
  "ai.tools.allowlist": {
    key: "ai.tools.allowlist",
    label: "Enabled tools",
    description: "Subset of the fixed tool registry. Empty/missing = all tools.",
    type: "stringArray",
    writePermission: "ai.configure",
  },
  "ai.limits.requestsPerUserPerDay": {
    key: "ai.limits.requestsPerUserPerDay",
    label: "Requests per user / day",
    description: "Assistant turns per user per UTC day. 0 = unlimited.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.limits.tokensPerUserPerDay": {
    key: "ai.limits.tokensPerUserPerDay",
    label: "Tokens per user / day",
    description: "Input+output tokens per user per UTC day. 0 = unlimited.",
    type: "integer",
    writePermission: "ai.configure",
  },
  "ai.embeddings.provider": {
    key: "ai.embeddings.provider",
    label: "Embedding provider",
    description: "ollama for quality, hash for free offline determinism.",
    type: "enum",
    options: ["hash", "ollama"],
    writePermission: "ai.configure",
  },
  "ai.embeddings.model": {
    key: "ai.embeddings.model",
    label: "Embedding model",
    description: "Used when the embedding provider is ollama.",
    type: "string",
    writePermission: "ai.configure",
  },
};

export function isAISettingKey(value: unknown): value is AISettingKey {
  return typeof value === "string" && (AI_SETTING_KEYS as readonly string[]).includes(value);
}

/** Strict model-name pattern: inert identifier chars only. */
export function isSafeModelName(value: string): boolean {
  return value.length >= 1 && value.length <= 100 && /^[A-Za-z0-9._:/-]+$/.test(value);
}

/**
 * Ollama tags `model` as `model:latest` — treat the two as equal when
 * matching against discovered names (exact match always wins).
 */
export function matchesDiscovered(candidate: string, discovered: readonly string[]): boolean {
  if (discovered.includes(candidate)) return true;
  if (discovered.includes(`${candidate}:latest`)) return true;
  return candidate.endsWith(":latest") && discovered.includes(candidate.slice(0, -":latest".length));
}

/** http(s) URLs only, length-capped. */
export function isSafeHttpUrl(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface SettingValidation {
  value?: unknown;
  errors?: Record<string, string[]>;
}

/**
 * Validate a candidate value for a key. `discoveredModels` (live provider
 * model list) makes model validation strict; without it, the safe pattern
 * applies so admins can pre-configure offline. Tool names validate against
 * the fixed registry passed by the caller (avoids a lib→tools import).
 */
export interface AIValidationContext {
  toolNames?: readonly string[];
  discoveredModels?: readonly string[];
  /** Known provider ids for model/fallback cross-checks. */
  providerIds?: readonly string[];
}

export function validateAISettingValue(
  key: AISettingKey,
  value: unknown,
  options: AIValidationContext = {},
): SettingValidation {
  const fail = (msg: string): SettingValidation => ({ errors: { value: [msg] } });
  const isInt = (v: unknown): v is number => Number.isInteger(v);
  switch (key) {
    case "ai.enabled":
      return typeof value === "boolean" ? { value } : fail("Must be a boolean.");
    case "ai.temperature":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 2
        ? { value }
        : fail("Must be a number between 0 and 2.");
    case "ai.maxTokens":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 8000
        ? { value }
        : fail("Must be an integer between 1 and 8000.");
    case "ai.maxRetries":
      return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3
        ? { value }
        : fail("Must be an integer between 0 and 3.");
    case "ai.recursionLimit":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 25
        ? { value }
        : fail("Must be an integer between 1 and 25.");
    case "ai.timeoutMs":
      return Number.isInteger(value) && (value as number) >= 10_000 && (value as number) <= 120_000
        ? { value }
        : fail("Must be an integer between 10000 and 120000 (ms).");
    case "ai.model":
    case "ai.embeddings.model": {
      if (typeof value !== "string" || value.length === 0) return fail("Must be a non-empty string.");
      if (options.discoveredModels && options.discoveredModels.length > 0) {
        return matchesDiscovered(value, options.discoveredModels)
          ? { value }
          : fail(`Unknown model. Discovered: ${options.discoveredModels.slice(0, 12).join(", ")}${options.discoveredModels.length > 12 ? "…" : ""}.`);
      }
      return isSafeModelName(value) ? { value } : fail("Must match [A-Za-z0-9._:/-] (max 100 chars).");
    }
    case "ai.provider.baseUrl":
      return typeof value === "string" && isSafeHttpUrl(value)
        ? { value: value.trim() }
        : fail("Must be an http(s) URL (max 200 chars).");
    case "ai.provider.apiKey":
      return typeof value === "string" && value.length >= 1 && value.length <= 500
        ? { value }
        : fail("Must be a non-empty secret (max 500 chars).");
    case "ai.prompts.system": {
      if (typeof value !== "string") return fail("Must be a string.");
      if (value.length > 8000) return fail("Must be 8000 characters or fewer.");
      return { value };
    }
    case "ai.tools.allowlist": {
      if (!Array.isArray(value)) return fail("Must be an array of tool names.");
      const names = options.toolNames ?? [];
      for (const name of value) {
        if (typeof name !== "string" || !names.includes(name)) {
          return fail(`Unknown tool: ${String(name)}. Only registry tools can be enabled.`);
        }
      }
      return { value: [...new Set(value)] };
    }
    case "ai.limits.requestsPerUserPerDay":
    case "ai.limits.tokensPerUserPerDay":
      return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 1_000_000
        ? { value }
        : fail("Must be an integer between 0 (unlimited) and 1000000.");
    case "ai.embeddings.provider":
      return value === "hash" || value === "ollama" ? { value } : fail("Must be hash or ollama.");
    case "ai.fallback": {
      if (value === null) return { value };
      if (typeof value !== "object" || Array.isArray(value)) {
        return fail("Must be null or { providerId, model }.");
      }
      const { providerId, model } = value as Record<string, unknown>;
      if (typeof providerId !== "string" || (options.providerIds && !options.providerIds.includes(providerId))) {
        return fail("Unknown providerId.");
      }
      if (typeof model !== "string" || !isSafeModelName(model)) {
        return fail("Model must match [A-Za-z0-9._:/-] (max 100 chars).");
      }
      if (options.discoveredModels && options.discoveredModels.length > 0 && !matchesDiscovered(model, options.discoveredModels)) {
        return fail("Model not discovered on reachable providers.");
      }
      return { value: { providerId, model } };
    }
    case "ai.providers": {
      if (!Array.isArray(value)) return fail("Must be an array of providers.");
      if (value.length > 10) return fail("At most 10 providers.");
      const ids = new Set<string>();
      const clean: Array<Record<string, unknown>> = [];
      for (const entry of value) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          return fail("Each provider must be an object.");
        }
        const e = entry as Record<string, unknown>;
        if (typeof e.id !== "string" || !/^[a-z0-9-]{1,32}$/.test(e.id)) {
          return fail("Provider id must match [a-z0-9-] (max 32 chars).");
        }
        if (ids.has(e.id)) return fail(`Duplicate provider id: ${e.id}.`);
        ids.add(e.id);
        if (typeof e.label !== "string" || e.label.trim().length === 0 || e.label.length > 60) {
          return fail("Provider label is required (max 60 chars).");
        }
        if (typeof e.enabled !== "boolean") return fail("Provider enabled must be a boolean.");
        if (typeof e.baseUrl !== "string" || !isSafeHttpUrl(e.baseUrl)) {
          return fail("Provider baseUrl must be an http(s) URL (max 200 chars).");
        }
        if (e.apiKey !== undefined && (typeof e.apiKey !== "string" || e.apiKey.length > 500)) {
          return fail("Provider apiKey must be a string (max 500 chars).");
        }
        clean.push({
          id: e.id,
          label: e.label.trim(),
          enabled: e.enabled,
          baseUrl: (e.baseUrl as string).trim(),
          ...(typeof e.apiKey === "string" && e.apiKey.length > 0 ? { apiKey: e.apiKey } : {}),
        });
      }
      return { value: clean };
    }
    case "ai.models": {
      if (!Array.isArray(value)) return fail("Must be an array of models.");
      if (value.length > 100) return fail("At most 100 model entries.");
      const seen = new Set<string>();
      const clean: Array<Record<string, unknown>> = [];
      for (const entry of value) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          return fail("Each model must be an object.");
        }
        const e = entry as Record<string, unknown>;
        if (typeof e.name !== "string" || !isSafeModelName(e.name)) {
          return fail("Model name must match [A-Za-z0-9._:/-] (max 100 chars).");
        }
        if (typeof e.providerId !== "string" || (options.providerIds && !options.providerIds.includes(e.providerId))) {
          return fail(`Unknown providerId for model ${e.name}.`);
        }
        const ref = `${e.providerId}/${e.name}`;
        if (seen.has(ref)) return fail(`Duplicate model entry: ${ref}.`);
        seen.add(ref);
        if (typeof e.enabled !== "boolean") return fail("Model enabled must be a boolean.");
        const opt = (field: string): number | undefined => {
          const v = e[field];
          if (v === undefined) return undefined;
          return typeof v === "number" ? v : NaN;
        };
        const temperature = opt("temperature");
        if (temperature !== undefined && !(temperature >= 0 && temperature <= 2)) {
          return fail("Model temperature must be between 0 and 2.");
        }
        const maxTokens = opt("maxTokens");
        if (maxTokens !== undefined && !(isInt(maxTokens) && maxTokens >= 1 && maxTokens <= 8000)) {
          return fail("Model maxTokens must be an integer between 1 and 8000.");
        }
        const dailyRequestLimit = opt("dailyRequestLimit");
        if (dailyRequestLimit !== undefined && !(isInt(dailyRequestLimit) && dailyRequestLimit >= 0 && dailyRequestLimit <= 1_000_000)) {
          return fail("Model dailyRequestLimit must be an integer between 0 and 1000000.");
        }
        const dailyTokenLimit = opt("dailyTokenLimit");
        if (dailyTokenLimit !== undefined && !(isInt(dailyTokenLimit) && dailyTokenLimit >= 0 && dailyTokenLimit <= 1_000_000)) {
          return fail("Model dailyTokenLimit must be an integer between 0 and 1000000.");
        }
        clean.push({
          name: e.name,
          providerId: e.providerId,
          enabled: e.enabled,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { maxTokens } : {}),
          ...(dailyRequestLimit !== undefined ? { dailyRequestLimit } : {}),
          ...(dailyTokenLimit !== undefined ? { dailyTokenLimit } : {}),
        });
      }
      return { value: clean };
    }
  }
}
