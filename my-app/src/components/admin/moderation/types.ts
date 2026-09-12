"use client";

import {
  ENTITY_CONFIG,
  actionsFor,
  type ModAction,
  type ModEntity,
} from "@/src/lib/moderation";
import type { ModItem } from "@/src/services/admin/moderation.service";

export type { ModItem };
export type { ModAction, ModEntity };

export type SortDir = "asc" | "desc";

export interface ModListParams {
  q?: string;
  status?: string | "all";
  sort: string;
  dir: SortDir;
  limit: number;
  offset: number;
}

export interface ModListResponse {
  items: ModItem[];
  total: number;
}

export interface ModDetail extends ModItem {
  excerpt: string;
  owner: { id: string; name: string; email: string; status: string } | null;
  workspace: { id: string; name: string; status: string } | null;
  history: Array<{ id: string; action: string; actorId: string; timestamp: string }>;
}

export interface ModCaps {
  moderate: boolean;
  destroy: boolean;
}

const LIVE_STATUSES: Record<ModEntity, string[]> = {
  notes: ["active"],
  tasks: ["todo", "in_progress", "done"],
  events: ["confirmed", "tentative"],
  projects: ["active", "on_hold", "completed"],
  goals: ["active", "achieved"],
};

/** Row actions for an item's lifecycle state (before capability filtering). */
export function availableActions(entity: ModEntity, status: string): ModAction[] {
  const all = actionsFor(entity);
  if (entity === "notes") {
    if (status === "trashed") return all.filter((a) => a === "restore" || a === "purge");
    if (status === "archived") return all.filter((a) => a !== "purge");
    return all.filter((a) => a !== "purge");
  }
  if (LIVE_STATUSES[entity].includes(status)) return all.filter((a) => a !== "restore");
  return all.filter((a) => a !== "archive");
}

/** Capability gate per action. Trash (notes delete) is reversible → moderate. */
export function canPerform(caps: ModCaps, entity: ModEntity, action: ModAction, status: string): boolean {
  if (action === "archive" || action === "restore") return caps.moderate;
  if (action === "purge") return caps.destroy;
  if (entity === "notes" && status !== "trashed") return caps.moderate;
  return caps.destroy;
}

export function sortOptionsFor(entity: ModEntity): Array<{ value: string; label: string }> {
  const base = [
    { value: "updatedAt", label: "Updated" },
    { value: "createdAt", label: "Created" },
    { value: "title", label: "Title" },
  ];
  return entity === "events" ? [{ value: "startsAt", label: "Starts" }, ...base] : base;
}

function toQuery(entity: ModEntity, params: ModListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.status && params.status !== "all") sp.set("status", params.status);
  sp.set("sort", params.sort || ENTITY_CONFIG[entity].defaultSort);
  sp.set("dir", params.dir);
  sp.set("limit", String(params.limit));
  sp.set("offset", String(params.offset));
  return sp.toString();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json as T;
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

export async function fetchContent(entity: ModEntity, params: ModListParams): Promise<ModListResponse> {
  const json = await get<ModListResponse>(`/api/admin/content/${entity}?${toQuery(entity, params)}`);
  return { items: json.items ?? [], total: json.total ?? 0 };
}

export async function fetchContentDetail(entity: ModEntity, id: string): Promise<ModDetail> {
  const json = await get<{ item?: ModDetail }>(`/api/admin/content/${entity}/${id}`);
  if (!json.item) throw new Error("Not found.");
  return json.item;
}

export async function runLifecycle(
  entity: ModEntity,
  id: string,
  action: ModAction,
  reason?: string,
): Promise<{ item: ModItem | null; purged: boolean }> {
  const res = await fetch(`/api/admin/content/${entity}/${id}/lifecycle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  const json = (await res.json().catch(() => null)) as { item?: ModItem | null; purged?: boolean; error?: string; errors?: unknown };
  if (!res.ok) throw new Error(apiErrorMessage(json, `Request failed (${res.status}).`));
  return { item: json.item ?? null, purged: json.purged ?? false };
}
