import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  type SecurityEventType,
  type SecuritySeverity,
} from "@/src/lib/db/admin-enums";

export interface SecurityListQuery {
  type?: SecurityEventType;
  types?: SecurityEventType[];
  severity?: SecuritySeverity;
  search?: string;
  email?: string;
  ipAddress?: string;
  since?: Date;
  until?: Date;
  limit: number;
  offset: number;
}

function isEventType(value: unknown): value is SecurityEventType {
  return typeof value === "string" && (SECURITY_EVENT_TYPES as readonly string[]).includes(value);
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Parse + clamp list query. Unknown enums are ignored, never error. */
export function parseSecurityListQuery(params: URLSearchParams): SecurityListQuery {
  const rawTypes = params.get("types");
  const types = rawTypes
    ? rawTypes.split(",").map((t) => t.trim()).filter(isEventType)
    : undefined;
  const rawType = params.get("type");
  const rawSeverity = params.get("severity");
  return {
    type: rawType && isEventType(rawType) ? rawType : undefined,
    types: types?.length ? types : undefined,
    severity:
      typeof rawSeverity === "string" &&
      (SECURITY_SEVERITIES as readonly string[]).includes(rawSeverity)
        ? (rawSeverity as SecuritySeverity)
        : undefined,
    search: params.get("q")?.trim() || undefined,
    email: params.get("email")?.trim() || undefined,
    ipAddress: params.get("ip")?.trim() || undefined,
    since: parseDate(params.get("since")),
    until: parseDate(params.get("until")),
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}
