"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ScrollText, Search } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useToast } from "@/src/components/ui/toast";
import { AuditDetailsDrawer } from "./AuditDetailsDrawer";
import { AuditFilters } from "./AuditFilters";
import { AuditTable, AuditTableSkeleton } from "./AuditTable";
import {
  DEFAULT_FILTERS,
  downloadExport,
  fetchAuditLog,
  fetchFilterOptions,
  type AuditEntry,
  type AuditFilters as FilterState,
  type FilterOptions,
} from "./types";

const EMPTY_OPTIONS: FilterOptions = { actions: [], resourceTypes: [], actors: [] };

/**
 * Audit explorer: search, filters, date range, pagination, inspect, CSV
 * export. Read-only by construction — no mutation UI exists anywhere.
 */
export function AuditManager({ canExport }: { canExport: boolean }) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce the freetext query (timeout callback — no sync setState).
  useEffect(() => {
    if (filters.q === debouncedQ) return;
    const t = window.setTimeout(() => {
      setDebouncedQ(filters.q);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  // Fetch-only effect: stale rows stay visible while the next page loads.
  useEffect(() => {
    let cancelled = false;
    fetchFilterOptions()
      .then((o) => {
        if (!cancelled) setOptions(o);
      })
      .catch(() => undefined);
    fetchAuditLog({ ...filters, q: debouncedQ }, page * filters.limit)
      .then((json) => {
        if (cancelled) return;
        setEntries(json.entries);
        setTotal(json.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, debouncedQ, page, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  function applyFilters(next: FilterState) {
    setFilters(next);
    setPage(0);
  }

  async function onExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadExport({ ...filters, q: debouncedQ });
      toast("Audit export downloaded.", { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setExporting(false);
    }
  }

  const pages = total === null ? 1 : Math.max(1, Math.ceil(total / filters.limit));
  const safePage = Math.min(page, pages - 1);
  const from = total === 0 || total === null ? 0 : safePage * filters.limit + 1;
  const to = total === null ? 0 : Math.min(total, (safePage + 1) * filters.limit);
  const hasActiveFilters =
    debouncedQ.trim() !== "" ||
    filters.action !== "all" ||
    filters.actorId !== "all" ||
    filters.resourceType !== "all" ||
    filters.result !== "all" ||
    filters.since !== "" ||
    filters.until !== "";

  return (
    <div className="grid content-start gap-4">
      <section
        aria-label="Find and filter audit entries"
        className="grid gap-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Filters
          </p>
          {canExport ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={exporting}
              className="ml-auto h-8"
            >
              <Download size={14} aria-hidden="true" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          ) : null}
        </div>
        <AuditFilters filters={filters} onChange={applyFilters} options={options} total={total} />
      </section>

      {loading && entries === null ? (
        <AuditTableSkeleton />
      ) : error && entries === null ? (
        <EmptyState
          icon={<ScrollText size={20} aria-hidden="true" />}
          title="Couldn't load audit log"
          description={error}
          action={
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : entries !== null && entries.length === 0 ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title={hasActiveFilters ? "No entries match" : "No audit entries yet"}
          description={
            hasActiveFilters
              ? "Try a different search or clear the filters."
              : "Entries appear here as soon as privileged actions run through the console."
          }
          action={
            hasActiveFilters ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => applyFilters(DEFAULT_FILTERS)}>
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      ) : entries !== null ? (
        <>
          {loading ? (
            <p role="status" className="text-xs text-zinc-500" aria-live="polite">
              Loading…
            </p>
          ) : error ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error} <Button type="button" size="sm" variant="ghost" onClick={retry}>Retry</Button>
            </p>
          ) : null}
          <div aria-busy={loading} className={loading ? "opacity-60" : undefined}>
            <AuditTable entries={entries} onView={(e) => setDrawerId(e.id)} />
          </div>
          <nav
            aria-label="Audit pages"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={safePage <= 0 || loading}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
              className="h-8"
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span className="max-sm:sr-only">Previous</span>
            </Button>
            <span className="min-w-0 flex-1 text-center text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-live="polite">
              {total === null ? "" : `${from}–${to} of ${total.toLocaleString()} · Page ${safePage + 1} of ${pages}`}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={safePage >= pages - 1 || loading}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
              className="h-8"
            >
              <span className="max-sm:sr-only">Next</span>
              <ChevronRight size={15} aria-hidden="true" />
            </Button>
          </nav>
        </>
      ) : null}

      <AuditDetailsDrawer entryId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
