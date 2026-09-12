"use client";

import { Search, X } from "lucide-react";
import {
  ADMIN_NOTIFICATION_PRIORITIES,
  ADMIN_NOTIFICATION_SEVERITIES,
  ADMIN_NOTIFICATION_SOURCES,
} from "@/src/lib/db/admin-enums";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { DEFAULT_INBOX_FILTERS, type InboxFilters } from "./types";

/** Search + severity/priority/source/read filters with unread count. */
export function NotificationsFilters({
  filters,
  onChange,
  unread,
}: {
  filters: InboxFilters;
  onChange: (next: InboxFilters) => void;
  unread: number | null;
}) {
  const isDefault = JSON.stringify({ ...filters, limit: 25 }) === JSON.stringify(DEFAULT_INBOX_FILTERS);
  const set = (patch: Partial<InboxFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-4">
      <div className="relative w-full">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
        />
        <Input
          id="inbox-search"
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search titles…"
          aria-label="Search notifications"
          size="sm"
          className="pr-9 pl-9"
        />
        {filters.q ? (
          <button
            type="button"
            onClick={() => set({ q: "" })}
            aria-label="Clear notification search"
            className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Select
          id="inbox-severity"
          label="Severity"
          size="sm"
          value={filters.severity}
          onChange={(e) => set({ severity: e.target.value })}
        >
          <option value="all">All</option>
          {ADMIN_NOTIFICATION_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          id="inbox-priority"
          label="Priority"
          size="sm"
          value={filters.priority}
          onChange={(e) => set({ priority: e.target.value })}
        >
          <option value="all">All</option>
          {ADMIN_NOTIFICATION_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select
          id="inbox-source"
          label="Source"
          size="sm"
          value={filters.source}
          onChange={(e) => set({ source: e.target.value })}
        >
          <option value="all">All sources</option>
          {ADMIN_NOTIFICATION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          id="inbox-read"
          label="State"
          size="sm"
          value={filters.read}
          onChange={(e) => set({ read: e.target.value })}
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </Select>
        <Select
          id="inbox-limit"
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
      <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
          {unread === null ? "Loading…" : `${unread.toLocaleString()} unread`}
        </p>
        {!isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(DEFAULT_INBOX_FILTERS)}
            className="ml-auto h-7 text-xs"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
