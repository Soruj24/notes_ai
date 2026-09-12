import {
  ENTITY_CONFIG,
  isModAction,
  isModEntity,
  type ModAction,
  type ModEntity,
} from "@/src/lib/moderation";
import type { ModListQuery } from "@/src/services/admin/moderation.service";

export type FieldErrors = Record<string, string[]>;

export function validateEntity(value: unknown): value is ModEntity {
  return isModEntity(value);
}

export function validateAction(value: unknown): { action?: ModAction; errors?: FieldErrors } {
  if (!isModAction(value)) {
    return { errors: { action: ["Action must be one of: archive, restore, delete, purge."] } };
  }
  return { action: value };
}

export function validateReason(reason: unknown): { reason?: string; errors?: FieldErrors } {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return {};
  if (text.length > 500) return { errors: { reason: ["Reason must be 500 characters or fewer."] } };
  return { reason: text };
}

/** Parse + clamp list query. Unknown status/sort fall back safely per entity. */
export function parseContentListQuery(entity: ModEntity, params: URLSearchParams): ModListQuery {
  const config = ENTITY_CONFIG[entity];
  const rawStatus = params.get("status");
  const known = config.statuses.some((s) => s.value === rawStatus);
  const rawSort = params.get("sort") ?? config.defaultSort;
  const allowedSorts = ["updatedAt", "createdAt", "title", ...(entity === "events" ? ["startsAt"] : [])];
  const rawWorkspace = params.get("workspace")?.trim();
  return {
    search: params.get("q")?.trim() || undefined,
    status: rawStatus && known ? rawStatus : undefined,
    workspaceId: rawWorkspace || undefined,
    sort: allowedSorts.includes(rawSort) ? rawSort : config.defaultSort,
    dir: params.get("dir") === "asc" ? "asc" : "desc",
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}
