/**
 * Metadata sanitization for security events and staff notifications.
 * Passwords, tokens, API keys, session secrets, and hashes must never
 * reach stored metadata, notification bodies, or API responses — this is
 * enforced at write time (repository backstop), not left to callers.
 */

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|api[_-]?key|auth|session|hash|private|credential|otp|backup|cookie|bearer/i;

const MAX_STRING_LEN = 500;
const MAX_KEYS = 25;
const MAX_DEPTH = 3;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING_LEN ? `${value.slice(0, MAX_STRING_LEN)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, MAX_KEYS).map((v) => sanitizeValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (count >= MAX_KEYS) break;
      count += 1;
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? "[redacted]" : sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return "[redacted]";
}

/** Deep-clean event metadata. Always returns a JSON-safe plain object. */
export function sanitizeMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (metadata === null || metadata === undefined) return undefined;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const clean = sanitizeValue(metadata, 0);
  return typeof clean === "object" && clean !== null && !Array.isArray(clean)
    ? (clean as Record<string, unknown>)
    : {};
}

/** True when a free-text value looks safe to include in notifications. */
export function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 254;
}
