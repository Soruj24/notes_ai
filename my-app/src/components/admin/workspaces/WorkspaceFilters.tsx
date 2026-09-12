"use client";

import { WORKSPACE_STATUSES, type WorkspaceStatus } from "@/src/lib/db/enums";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import type { SortDir, WorkspaceSortKey } from "./types";

export interface WorkspaceFilterState {
  status: WorkspaceStatus | "all";
  sort: WorkspaceSortKey;
  dir: SortDir;
  limit: number;
}

const SORT_OPTIONS: Array<{ value: WorkspaceSortKey; label: string }> = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
];

/** Status / sort / page-size selects plus result count and reset. */
export function WorkspaceFilters({
  filters,
  onChange,
  total,
}: {
  filters: WorkspaceFilterState;
  onChange: (next: WorkspaceFilterState) => void;
  total: number | null;
}) {
  const isDefault =
    filters.status === "all" && filters.sort === "createdAt" && filters.dir === "desc" && filters.limit === 25;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          id="admin-workspaces-status"
          label="Status"
          size="sm"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as WorkspaceFilterState["status"] })}
        >
          <option value="all">All statuses</option>
          {WORKSPACE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          id="admin-workspaces-sort"
          label="Sort by"
          size="sm"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as WorkspaceSortKey })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          id="admin-workspaces-dir"
          label="Direction"
          size="sm"
          value={filters.dir}
          onChange={(e) => onChange({ ...filters, dir: e.target.value as SortDir })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <Select
          id="admin-workspaces-limit"
          label="Per page"
          size="sm"
          value={String(filters.limit)}
          onChange={(e) => onChange({ ...filters, limit: Number(e.target.value) })}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
          {total === null ? "Loading…" : `${total.toLocaleString()} workspace${total === 1 ? "" : "s"}`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ status: "all", sort: "createdAt", dir: "desc", limit: 25 })}
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
