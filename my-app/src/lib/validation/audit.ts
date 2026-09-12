import type { AuditResult } from "@/src/models/admin-audit-log.model";

export interface AuditListQuery {
  search?: string;
  action?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  since?: Date;
  until?: Date;
  limit: number;
  offset: number;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Parse + clamp list/export query params. Unknown enums are ignored. */
export function parseAuditListQuery(params: URLSearchParams): AuditListQuery {
  const rawResult = params.get("result");
  return {
    search: params.get("q")?.trim() || undefined,
    action: params.get("action")?.trim() || undefined,
    actorId: params.get("actorId")?.trim() || undefined,
    resourceType: params.get("resourceType")?.trim() || undefined,
    resourceId: params.get("resourceId")?.trim() || undefined,
    result: rawResult === "success" || rawResult === "denied" ? rawResult : undefined,
    since: parseDate(params.get("since")),
    until: parseDate(params.get("until")),
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}
