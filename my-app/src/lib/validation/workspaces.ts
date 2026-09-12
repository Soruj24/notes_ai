import { WORKSPACE_STATUSES, type WorkspaceStatus } from "@/src/lib/db/enums";
import type {
  WorkspaceListFilters,
  WorkspaceSortDir,
  WorkspaceSortKey,
} from "@/src/repositories/workspace.repository";

export type FieldErrors = Record<string, string[]>;

export interface WorkspaceListQuery extends WorkspaceListFilters {
  sort: WorkspaceSortKey;
  dir: WorkspaceSortDir;
  limit: number;
  offset: number;
}

const SORT_KEYS: readonly string[] = ["createdAt", "updatedAt", "name"];

function isWorkspaceStatus(value: unknown): value is WorkspaceStatus {
  return typeof value === "string" && (WORKSPACE_STATUSES as readonly string[]).includes(value);
}

/** Parse + clamp list query params. Unknown enums fall back to defaults. */
export function parseWorkspaceListQuery(params: URLSearchParams): WorkspaceListQuery {
  const rawSort = params.get("sort") ?? "createdAt";
  const rawDir = params.get("dir") ?? "desc";
  const rawStatus = params.get("status");
  return {
    search: params.get("q")?.trim() || undefined,
    status: rawStatus && isWorkspaceStatus(rawStatus) ? rawStatus : undefined,
    sort: (SORT_KEYS.includes(rawSort) ? rawSort : "createdAt") as WorkspaceSortKey,
    dir: rawDir === "asc" ? "asc" : "desc",
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100),
    offset: Math.max(Number(params.get("offset") ?? 0) || 0, 0),
  };
}

export function validateWorkspaceStatus(
  status: unknown,
): { status?: WorkspaceStatus; errors?: FieldErrors } {
  if (!isWorkspaceStatus(status)) {
    return { errors: { status: [`Status must be one of: ${WORKSPACE_STATUSES.join(", ")}.`] } };
  }
  return { status };
}

export function validateStatusReason(
  reason: unknown,
): { reason?: string; errors?: FieldErrors } {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return {};
  if (text.length > 500) return { errors: { reason: ["Reason must be 500 characters or fewer."] } };
  return { reason: text };
}
