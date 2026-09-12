"use client";

import type { WorkspaceStatus } from "@/src/lib/db/enums";

export interface AdminWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  status: WorkspaceStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceOwner {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string | null;
}

export interface AdminWorkspaceDetail extends Omit<AdminWorkspace, "memberCount" | "ownerName"> {
  owner: WorkspaceOwner | null;
  lastStatusChange?: { action: string; timestamp: string; reason?: string };
}

export interface WorkspaceStats {
  members: number;
  notes: number;
  tasks: number;
  tasksDone: number;
  projects: number;
  goals: number;
  attachments: number;
  storageBytes: number;
  aiConversations: number;
  aiMessages: number;
  aiTokens: number;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  role: string;
  joinedAt: string;
}

export interface WorkspaceContentItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export interface WorkspaceContent {
  notes: WorkspaceContentItem[];
  tasks: WorkspaceContentItem[];
  projects: WorkspaceContentItem[];
  goals: WorkspaceContentItem[];
}

export type WorkspaceSortKey = "createdAt" | "updatedAt" | "name";
export type SortDir = "asc" | "desc";

export interface WorkspaceListParams {
  q?: string;
  status?: WorkspaceStatus | "all";
  sort: WorkspaceSortKey;
  dir: SortDir;
  limit: number;
  offset: number;
}

export interface WorkspaceListResponse {
  workspaces: AdminWorkspace[];
  total: number;
}

export type WorkspaceStatusAction = "suspend" | "unsuspend" | "archive" | "delete";

export const STATUS_FOR_ACTION: Record<WorkspaceStatusAction, WorkspaceStatus> = {
  suspend: "SUSPENDED",
  unsuspend: "ACTIVE",
  archive: "ARCHIVED",
  delete: "DELETED",
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (const u of units) {
    unit = u;
    if (value < 1024 || u === "GB") break;
    value /= 1024;
  }
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${unit}`;
}

function toQuery(params: WorkspaceListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.status && params.status !== "all") sp.set("status", params.status);
  sp.set("sort", params.sort);
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

/** Extract a human message from { error } or { errors: { field: [msgs] } }. */
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

async function mutate<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as T & { error?: string; errors?: unknown };
  if (!res.ok) throw new Error(apiErrorMessage(json, `Request failed (${res.status}).`));
  return json as T;
}

export async function fetchWorkspaces(params: WorkspaceListParams): Promise<WorkspaceListResponse> {
  const json = await get<WorkspaceListResponse>(`/api/admin/workspaces?${toQuery(params)}`);
  return { workspaces: json.workspaces ?? [], total: json.total ?? 0 };
}

export async function fetchWorkspaceDetail(id: string): Promise<AdminWorkspaceDetail> {
  const json = await get<{ workspace?: AdminWorkspaceDetail }>(`/api/admin/workspaces/${id}`);
  if (!json.workspace) throw new Error("Workspace not found.");
  return json.workspace;
}

export async function fetchWorkspaceStats(id: string): Promise<WorkspaceStats> {
  const json = await get<{ stats?: WorkspaceStats }>(`/api/admin/workspaces/${id}/stats`);
  if (!json.stats) throw new Error("Workspace not found.");
  return json.stats;
}

export async function fetchWorkspaceMembers(id: string): Promise<WorkspaceMember[]> {
  const json = await get<{ members?: WorkspaceMember[] }>(`/api/admin/workspaces/${id}/members`);
  return json.members ?? [];
}

export async function fetchWorkspaceContent(id: string): Promise<WorkspaceContent> {
  const json = await get<WorkspaceContent>(`/api/admin/workspaces/${id}/content`);
  return {
    notes: json.notes ?? [],
    tasks: json.tasks ?? [],
    projects: json.projects ?? [],
    goals: json.goals ?? [],
  };
}

export function changeWorkspaceStatus(
  id: string,
  status: WorkspaceStatus,
  reason?: string,
): Promise<{ workspace: AdminWorkspaceDetail }> {
  return mutate(`/api/admin/workspaces/${id}/status`, { status, reason });
}
