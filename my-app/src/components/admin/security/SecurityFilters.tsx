"use client";

import { Search, X } from "lucide-react";
import { SECURITY_EVENT_TYPES, SECURITY_SEVERITIES } from "@/src/lib/db/admin-enums";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { DEFAULT_SECURITY_FILTERS, type SecurityFilterState } from "./types";

/** Search + type/severity/date filters with result count. */
export function SecurityFilters({
  filters,
  onChange,
  total,
}: {
  filters: SecurityFilterState;
  onChange: (next: SecurityFilterState) => void;
  total: number | null;
}) {
  const isDefault = JSON.stringify({ ...filters, limit: 25 }) === JSON.stringify(DEFAULT_SECURITY_FILTERS);
  const set = (patch: Partial<SecurityFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-4">
      <div className="relative w-full">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
        />
        <Input
          id="security-search"
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search type, email, IP…"
          aria-label="Search security events"
          size="sm"
          className="pr-9 pl-9"
        />
        {filters.q ? (
          <button
            type="button"
            onClick={() => set({ q: "" })}
            aria-label="Clear security search"
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Select
          id="security-type"
          label="Type"
          size="sm"
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          <option value="all">All types</option>
          <option value="__session">Session activity</option>
          {SECURITY_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          id="security-severity"
          label="Severity"
          size="sm"
          value={filters.severity}
          onChange={(e) => set({ severity: e.target.value })}
        >
          <option value="all">All severities</option>
          {SECURITY_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          id="security-since"
          label="From"
          type="date"
          value={filters.since}
          onChange={(e) => set({ since: e.target.value })}
          size="sm"
        />
        <Input
          id="security-until"
          label="To"
          type="date"
          value={filters.until}
          onChange={(e) => set({ until: e.target.value })}
          size="sm"
        />
        <Select
          id="security-limit"
          label="Per page"
          size="sm"
          value={String(filters.limit)}
          onChange={(e) => set({ limit: Number(e.target.value) })}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
          {total === null ? "Loading…" : `${total.toLocaleString()} event${total === 1 ? "" : "s"}`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(DEFAULT_SECURITY_FILTERS)}
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
