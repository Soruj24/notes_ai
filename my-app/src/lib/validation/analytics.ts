export type AnalyticsRangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export interface AnalyticsRange {
  key: AnalyticsRangeKey;
  /** Inclusive UTC start-of-day. */
  since: Date;
  /** Inclusive UTC end-of-day. */
  until: Date;
  days: number;
}

const DAY_MS = 86_400_000;
const MAX_CUSTOM_DAYS = 366;

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDay(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Resolve the range filter. Unknown keys fall back to 30d; custom spans
 * clamp to MAX_CUSTOM_DAYS so aggregations stay bounded.
 */
export function parseAnalyticsRange(params: URLSearchParams, now = new Date()): AnalyticsRange {
  const raw = params.get("range");
  const key: AnalyticsRangeKey =
    raw === "today" || raw === "7d" || raw === "30d" || raw === "90d" || raw === "custom"
      ? raw
      : "30d";
  const today = startOfDayUTC(now);
  if (key === "today") {
    return { key, since: today, until: new Date(today.getTime() + DAY_MS - 1), days: 1 };
  }
  if (key !== "custom") {
    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    const since = new Date(today.getTime() - (days - 1) * DAY_MS);
    return { key, since, until: new Date(today.getTime() + DAY_MS - 1), days };
  }
  let since = parseDay(params.get("since")) ?? new Date(today.getTime() - 29 * DAY_MS);
  let until = parseDay(params.get("until")) ?? today;
  if (since.getTime() > until.getTime()) [since, until] = [until, since];
  const spanDays = Math.floor((startOfDayUTC(until).getTime() - startOfDayUTC(since).getTime()) / DAY_MS) + 1;
  if (spanDays > MAX_CUSTOM_DAYS) {
    since = new Date(startOfDayUTC(until).getTime() - (MAX_CUSTOM_DAYS - 1) * DAY_MS);
  }
  const start = startOfDayUTC(since);
  const days = Math.floor((startOfDayUTC(until).getTime() - start.getTime()) / DAY_MS) + 1;
  return { key, since: start, until: new Date(start.getTime() + days * DAY_MS - 1), days };
}
