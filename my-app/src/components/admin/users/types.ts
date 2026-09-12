"use client";

import type { UserStatus } from "@/src/lib/db/admin-enums";
import type { PlatformRole } from "@/src/lib/rbac/roles";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole | null;
  status: UserStatus;
  isAdmin: boolean;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  suspensionReason?: string;
}

export type UserSortKey = "createdAt" | "lastActiveAt" | "name" | "email";
export type SortDir = "asc" | "desc";

export interface UserListParams {
  q?: string;
  status?: UserStatus | "all";
  role?: string | "all";
  sort: UserSortKey;
  dir: SortDir;
  limit: number;
  offset: number;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
}

export interface MembershipSummary {
  workspaceId: string;
  workspaceName: string;
  role: string;
  joinedAt: string;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserActivityResponse {
  activity: Array<{
    id: string;
    workspaceId: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    actorId: string;
    timestamp: string;
  }>;
}

export type StatusAction = "suspend" | "unsuspend" | "ban" | "delete";

export const STATUS_FOR_ACTION: Record<StatusAction, UserStatus> = {
  suspend: "SUSPENDED",
  unsuspend: "ACTIVE",
  ban: "BANNED",
  delete: "DELETED",
};

function toQuery(params: UserListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.role && params.role !== "all") sp.set("role", params.role);
  sp.set("sort", params.sort);
  sp.set("dir", params.dir);
  sp.set("limit", String(params.limit));
  sp.set("offset", String(params.offset));
  return sp.toString();
}

export async function fetchUsers(params: UserListParams): Promise<UserListResponse> {
  const res = await fetch(`/api/admin/users?${toQuery(params)}`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as UserListResponse & { error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return { users: json.users ?? [], total: json.total ?? 0 };
}

export async function fetchUserDetail(id: string): Promise<AdminUserDetail> {
  const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { user?: AdminUserDetail; error?: string };
  if (!res.ok || !json?.user) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json.user;
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

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as T & { error?: string; errors?: unknown };
  if (!res.ok) throw new Error(apiErrorMessage(json, `Request failed (${res.status}).`));
  return json as T;
}

export function patchUserName(id: string, name: string): Promise<{ user: AdminUserDetail }> {
  return mutate(`/api/admin/users/${id}`, "PATCH", { name });
}

export function changeStatus(
  id: string,
  status: UserStatus,
  reason?: string,
): Promise<{ user: AdminUserDetail }> {
  return mutate(`/api/admin/users/${id}/status`, "POST", { status, reason });
}

export function changeRole(
  id: string,
  role: PlatformRole | null,
): Promise<{ user: AdminUserDetail }> {
  return mutate(`/api/admin/users/${id}/role`, "POST", { role });
}

export function revokeSessions(id: string): Promise<{ revoked: number }> {
  return mutate(`/api/admin/users/${id}/sessions/revoke`, "POST");
}

export async function fetchSessions(id: string): Promise<SessionSummary[]> {
  const res = await fetch(`/api/admin/users/${id}/sessions`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { sessions?: SessionSummary[]; error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json.sessions ?? [];
}

export async function fetchMemberships(id: string): Promise<MembershipSummary[]> {
  const res = await fetch(`/api/admin/users/${id}/memberships`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { memberships?: MembershipSummary[]; error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json.memberships ?? [];
}

export async function fetchActivity(id: string): Promise<UserActivityResponse> {
  const res = await fetch(`/api/admin/users/${id}/activity`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as UserActivityResponse & { error?: string };
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `Request failed (${res.status}).`);
  return { activity: json.activity ?? [], audit: json.audit ?? [] };
}
