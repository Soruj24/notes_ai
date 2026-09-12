import { getRateLimitStore, type RateLimitDecision } from "@/src/lib/rate-limit/store";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Check-and-record one hit. Async signature so the Redis-backed store
 * drops in without touching callers.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitDecision> {
  return getRateLimitStore().take(opts.key, opts.limit, opts.windowMs);
}

/** Current window count without recording (login pre-check pattern). */
export function peekRateLimit(key: string, windowMs: number): { count: number; resetMs: number } {
  return getRateLimitStore().inspect(key, windowMs);
}

/** Clear a bucket (e.g. successful authentication resets failures). */
export function resetRateLimit(key: string): void {
  getRateLimitStore().reset(key);
}
