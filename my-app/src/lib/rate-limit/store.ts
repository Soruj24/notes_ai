/**
 * Shared rate-limit architecture. Fixed-window counters behind a store
 * interface: single-instance memory today, shared Redis tomorrow (inject
 * via setRateLimitStore; no callers change). Keys are namespaced by
 * feature (`login:<email>`, `admin:<label>:<userId>`, `ai:command:<id>`).
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimitStore {
  /** Current window count without recording (pre-checks). */
  inspect(key: string, windowMs: number, now?: number): { count: number; resetMs: number };
  /** Record one hit; allowed=false when the window is exhausted. */
  take(key: string, limit: number, windowMs: number, now?: number): RateLimitDecision;
  /** Clear a key (e.g. successful login resets the failure bucket). */
  reset(key: string): void;
}

const MAX_KEYS = 10000;

interface Bucket {
  count: number;
  reset: number;
}

/** Process-local store. Correct per instance; use sticky sessions or the Redis store when scaling. */
export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  private prune(now: number): void {
    if (this.buckets.size <= MAX_KEYS) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.reset <= now) this.buckets.delete(key);
    }
    if (this.buckets.size > MAX_KEYS) this.buckets.clear();
  }

  inspect(key: string, windowMs: number, now = Date.now()): { count: number; resetMs: number } {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.reset <= now) return { count: 0, resetMs: windowMs };
    return { count: bucket.count, resetMs: Math.max(0, bucket.reset - now) };
  }

  take(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision {
    this.prune(now);
    const current = this.buckets.get(key);
    if (!current || current.reset <= now) {
      const reset = now + windowMs;
      this.buckets.set(key, { count: 1, reset });
      return { allowed: 1 <= limit, remaining: Math.max(0, limit - 1), resetMs: windowMs };
    }
    current.count += 1;
    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetMs: Math.max(0, current.reset - now),
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

let current: RateLimitStore = new MemoryRateLimitStore();

export function getRateLimitStore(): RateLimitStore {
  return current;
}

/** Seam for tests and the future shared store. */
export function setRateLimitStore(store: RateLimitStore): void {
  current = store;
}
