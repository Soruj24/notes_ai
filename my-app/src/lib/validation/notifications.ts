import {
  ADMIN_NOTIFICATION_PRIORITIES,
  ADMIN_NOTIFICATION_SEVERITIES,
  ADMIN_NOTIFICATION_SOURCES,
} from "@/src/lib/db/admin-enums";

/** Parse + clamp inbox query params. Unknown enums are ignored. */
export function parseInboxQuery(params: URLSearchParams): {
  severity?: string;
  priority?: string;
  source?: string;
  read?: "read" | "unread";
  search?: string;
  limit: number;
  offset: number;
} {
  const pick = (values: readonly string[], raw: string | null): string | undefined =>
    raw && (values as readonly string[]).includes(raw) ? raw : undefined;
  const read = params.get("read");
  return {
    severity: pick(ADMIN_NOTIFICATION_SEVERITIES, params.get("severity")),
    priority: pick(ADMIN_NOTIFICATION_PRIORITIES, params.get("priority")),
    source: pick(ADMIN_NOTIFICATION_SOURCES, params.get("source")),
    read: read === "read" || read === "unread" ? read : undefined,
    search: params.get("q")?.trim() || undefined,
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}
