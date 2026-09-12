"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { DEFAULT_FILTERS, type AuditFilters, type FilterOptions } from "./types";

/** Search + action/admin/resource/result/date filters with result count. */
export function AuditFilters({
  filters,
  onChange,
  options,
  total,
}: {
  filters: AuditFilters;
  onChange: (next: AuditFilters) => void;
  options: FilterOptions;
  total: number | null;
}) {
  const isDefault = JSON.stringify({ ...filters, limit: 25 }) === JSON.stringify(DEFAULT_FILTERS);
  const set = (patch: Partial<AuditFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-4">
      <div className="relative w-full">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
        />
        <Input
          id="audit-search"
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search action, resource, ID, IP…"
          aria-label="Search audit log"
          size="sm"
          className="pr-9 pl-9"
        />
        {filters.q ? (
          <button
            type="button"
            onClick={() => set({ q: "" })}
            aria-label="Clear audit search"
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Select
          id="audit-action"
          label="Action"
          size="sm"
          value={filters.action}
          onChange={(e) => set({ action: e.target.value })}
        >
          <option value="all">All actions</option>
          {options.actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          id="audit-admin"
          label="Admin"
          size="sm"
          value={filters.actorId}
          onChange={(e) => set({ actorId: e.target.value })}
        >
          <option value="all">All admins</option>
          {options.actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.email || a.id.slice(0, 8)}
            </option>
          ))}
        </Select>
        <Select
          id="audit-resource"
          label="Resource"
          size="sm"
          value={filters.resourceType}
          onChange={(e) => set({ resourceType: e.target.value })}
        >
          <option value="all">All resources</option>
          {options.resourceTypes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          id="audit-result"
          label="Result"
          size="sm"
          value={filters.result}
          onChange={(e) => set({ result: e.target.value })}
        >
          <option value="all">All results</option>
          <option value="success">Success</option>
          <option value="denied">Denied</option>
        </Select>
        <Input
          id="audit-since"
          label="From"
          type="date"
          value={filters.since}
          onChange={(e) => set({ since: e.target.value })}
          size="sm"
        />
        <Input
          id="audit-until"
          label="To"
          type="date"
          value={filters.until}
          onChange={(e) => set({ until: e.target.value })}
          size="sm"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <Select
          id="audit-limit"
          label="Per page"
          size="sm"
          value={String(filters.limit)}
          onChange={(e) => set({ limit: Number(e.target.value) })}
          className="w-28"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </Select>
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
          {total === null ? "Loading…" : `${total.toLocaleString()} entr${total === 1 ? "y" : "ies"}`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
