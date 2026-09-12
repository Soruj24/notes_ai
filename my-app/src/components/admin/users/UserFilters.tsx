"use client";

import { USER_STATUSES, type UserStatus } from "@/src/lib/db/admin-enums";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import type { SortDir, UserSortKey } from "./types";

export interface UserFilterState {
  status: UserStatus | "all";
  role: string;
  sort: UserSortKey;
  dir: SortDir;
  limit: number;
}

const SORT_OPTIONS: Array<{ value: UserSortKey; label: string }> = [
  { value: "createdAt", label: "Joined" },
  { value: "lastActiveAt", label: "Last active" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
];

/** Status / role / sort / page-size selects plus result count and reset. */
export function UserFilters({
  filters,
  onChange,
  total,
}: {
  filters: UserFilterState;
  onChange: (next: UserFilterState) => void;
  total: number | null;
}) {
  const isDefault =
    filters.status === "all" &&
    filters.role === "all" &&
    filters.sort === "createdAt" &&
    filters.dir === "desc" &&
    filters.limit === 25;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Select
          id="admin-users-status"
          label="Status"
          size="sm"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as UserFilterState["status"] })}
        >
          <option value="all">All statuses</option>
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          id="admin-users-role"
          label="Role"
          size="sm"
          value={filters.role}
          onChange={(e) => onChange({ ...filters, role: e.target.value })}
        >
          <option value="all">All roles</option>
          <option value="none">No role (user)</option>
          {PLATFORM_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          id="admin-users-sort"
          label="Sort by"
          size="sm"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as UserSortKey })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          id="admin-users-dir"
          label="Direction"
          size="sm"
          value={filters.dir}
          onChange={(e) => onChange({ ...filters, dir: e.target.value as SortDir })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <Select
          id="admin-users-limit"
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
          {total === null ? "Loading…" : `${total.toLocaleString()} account${total === 1 ? "" : "s"}`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({ status: "all", role: "all", sort: "createdAt", dir: "desc", limit: 25 })
            }
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
