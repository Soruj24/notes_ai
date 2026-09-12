"use client";

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
  result: "success" | "denied";
  timestamp: string;
}

export interface AuditDetail extends AuditEntry {
  metadata: Record<string, unknown> | null;
}

export interface AuditFilters {
  q: string;
  action: string;
  actorId: string;
  resourceType: string;
  result: string;
  since: string;
  until: string;
  limit: number;
}

export const DEFAULT_FILTERS: AuditFilters = {
  q: "",
  action: "all",
  actorId: "all",
  resourceType: "all",
  result: "all",
  since: "",
  until: "",
  limit: 25,
};

export interface FilterOptions {
  actions: string[];
  resourceTypes: string[];
  actors: Array<{ id: string; name: string; email: string; role?: string }>;
}

export function toQuery(f: AuditFilters, offset: number): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.action !== "all") sp.set("action", f.action);
  if (f.actorId !== "all") sp.set("actorId", f.actorId);
  if (f.resourceType !== "all") sp.set("resourceType", f.resourceType);
  if (f.result !== "all") sp.set("result", f.result);
  if (f.since) sp.set("since", f.since);
  if (f.until) sp.set("until", f.until);
  sp.set("limit", String(f.limit));
  sp.set("offset", String(offset));
  return sp.toString();
}

export function apiErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const j = json as { error?: unknown; errors?: unknown };
    if (typeof j.error === "string") return j.error;
    if (j.errors && typeof j.errors === "object") {
      const first = Object.values(j.errors as Record<string, unknown>).flat().find((v) => typeof v === "string");
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json as T;
}

export async function fetchAuditLog(
  filters: AuditFilters,
  offset: number,
): Promise<{ entries: AuditEntry[]; total: number }> {
  const json = await get<{ entries?: AuditEntry[]; total?: number }>(
    `/api/admin/audit-logs?${toQuery(filters, offset)}`,
  );
  return { entries: json.entries ?? [], total: json.total ?? 0 };
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const json = await get<Partial<FilterOptions>>("/api/admin/audit-logs/filters");
  return { actions: json.actions ?? [], resourceTypes: json.resourceTypes ?? [], actors: json.actors ?? [] };
}

export async function fetchAuditDetail(id: string): Promise<AuditDetail> {
  const json = await get<{ entry?: AuditDetail }>(`/api/admin/audit-logs/${id}`);
  if (!json.entry) throw new Error("Audit entry not found.");
  return json.entry;
}

/** Download the filtered trail as CSV (same filters as the table). */
export async function downloadExport(filters: AuditFilters): Promise<void> {
  const res = await fetch(`/api/admin/audit-logs/export?${toQuery(filters, 0)}`, { cache: "no-store" });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string };
    throw new Error(json?.error ?? `Export failed (${res.status}).`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
