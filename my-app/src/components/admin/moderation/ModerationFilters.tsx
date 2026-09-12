"use client";

import { ENTITY_CONFIG, type ModEntity } from "@/src/lib/moderation";
import { Button } from "@/src/components/ui/button";
import { Select } from "@/src/components/ui/select";
import { sortOptionsFor, type SortDir } from "./types";

export interface ModFilterState {
  status: string;
  sort: string;
  dir: SortDir;
  limit: number;
}

/** Status / sort / page-size selects plus result count and reset. */
export function ModerationFilters({
  entity,
  filters,
  onChange,
  total,
}: {
  entity: ModEntity;
  filters: ModFilterState;
  onChange: (next: ModFilterState) => void;
  total: number | null;
}) {
  const config = ENTITY_CONFIG[entity];
  const isDefault =
    filters.status === "all" && filters.sort === config.defaultSort && filters.dir === "desc" && filters.limit === 25;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          id="admin-content-status"
          label="Status"
          size="sm"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="all">All statuses</option>
          {config.statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          id="admin-content-sort"
          label="Sort by"
          size="sm"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        >
          {sortOptionsFor(entity).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          id="admin-content-dir"
          label="Direction"
          size="sm"
          value={filters.dir}
          onChange={(e) => onChange({ ...filters, dir: e.target.value as SortDir })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <Select
          id="admin-content-limit"
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
          {total === null ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? config.singular : config.label.toLowerCase()}`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ status: "all", sort: config.defaultSort, dir: "desc", limit: 25 })}
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
