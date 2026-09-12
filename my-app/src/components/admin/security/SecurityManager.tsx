"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ChevronLeft, ChevronRight, Search, ShieldAlert } from "lucide-react";
import { StatCard } from "@/src/components/admin/StatCard";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { fetchAuditLog } from "@/src/components/admin/audit/types";
import { SecurityDetailsDrawer } from "./SecurityDetailsDrawer";
import { SecurityFilters } from "./SecurityFilters";
import { SecurityTable, SecurityTableSkeleton, formatDateTime } from "./SecurityTable";
import {
  DEFAULT_SECURITY_FILTERS,
  fetchAdminActions,
  fetchSecurityEvents,
  fetchSecurityOverview,
  type AdminActionView,
  type SecurityEventView,
  type SecurityFilterState,
  type SecurityOverview,
} from "./types";

interface AuditDeniedView {
  id: string;
  action: string;
  timestamp: string;
}

/**
 * Security console: overview cards (click to filter), the filterable event
 * stream, recent admin actions, and blocked requests. Read-only throughout.
 */
export function SecurityManager() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [filters, setFilters] = useState<SecurityFilterState>(DEFAULT_SECURITY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<SecurityEventView[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [adminActions, setAdminActions] = useState<AdminActionView[] | null>(null);
  const [blocked, setBlocked] = useState<AuditDeniedView[] | null>(null);

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
    fetchSecurityOverview()
      .then((o) => {
        if (!cancelled) setOverview(o);
      })
      .catch(() => undefined);
    fetchAdminActions()
      .then((a) => {
        if (!cancelled) setAdminActions(a);
      })
      .catch(() => undefined);
    fetchAuditLog(
      {
        q: "",
        action: "ADMIN_ACCESS_DENIED",
        actorId: "all",
        resourceType: "all",
        result: "all",
        since: "",
        until: "",
        limit: 8,
      },
      0,
    )
      .then((r) => {
        if (!cancelled) setBlocked(r.entries.map((e) => ({ id: e.id, action: e.action, timestamp: e.timestamp })));
      })
      .catch(() => {
        if (!cancelled) setBlocked([]);
      });
    fetchSecurityEvents({ ...filters, q: debouncedQ }, page * filters.limit)
      .then((json) => {
        if (cancelled) return;
        setEvents(json.events);
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

  function preset(patch: Partial<SecurityFilterState>) {
    setFilters({ ...DEFAULT_SECURITY_FILTERS, ...patch });
    setPage(0);
  }

  const pages = total === null ? 1 : Math.max(1, Math.ceil(total / filters.limit));
  const safePage = Math.min(page, pages - 1);
  const from = total === 0 || total === null ? 0 : safePage * filters.limit + 1;
  const to = total === null ? 0 : Math.min(total, (safePage + 1) * filters.limit);
  const hasActiveFilters =
    debouncedQ.trim() !== "" ||
    filters.type !== "all" ||
    filters.severity !== "all" ||
    filters.since !== "" ||
    filters.until !== "";

  const presets = overview
    ? [
        {
          type: "login.failed",
          label: "Filter failed logins",
          pressed: filters.type === "login.failed",
          alert: overview.failedLogins24h > 0,
          card: (
            <StatCard label="Failed logins (24h)" value={overview.failedLogins24h.toLocaleString()} hint={`${overview.failedLogins7d.toLocaleString()} in 7d`} icon={ShieldAlert} />
          ),
        },
        {
          type: "suspicious.activity",
          label: "Filter suspicious activity",
          pressed: filters.type === "suspicious.activity",
          alert: overview.criticalUnhandled > 0,
          card: (
            <StatCard label="Suspicious" value={overview.suspiciousTotal.toLocaleString()} hint={`${overview.criticalUnhandled.toLocaleString()} critical unhandled`} icon={Activity} />
          ),
        },
        {
          type: "rate.limited",
          label: "Filter rate-limit events",
          pressed: filters.type === "rate.limited",
          alert: overview.rateLimited24h > 0,
          card: (
            <StatCard label="Rate-limited (24h)" value={overview.rateLimited24h.toLocaleString()} hint={`${overview.rateLimited7d.toLocaleString()} in 7d`} icon={Activity} />
          ),
        },
        {
          type: "__session",
          label: "Filter session activity",
          pressed: filters.type === "__session",
          alert: false,
          card: (
            <StatCard label="Active sessions" value={overview.sessionsActive.toLocaleString()} hint={`${overview.sessionsRevoked7d.toLocaleString()} revoked in 7d`} icon={Activity} />
          ),
        },
      ]
    : [];

  return (
    <div className="grid content-start gap-4">
      {overview ? (
        <section aria-label="Security overview" className="grid gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Select a card to filter the event stream below.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {presets.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => preset({ type: p.type })}
                aria-label={p.label}
                aria-pressed={p.pressed}
                className={`cursor-pointer rounded-xl text-left ring-2 ring-offset-2 ring-offset-zinc-100 transition-[box-shadow,transform] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:ring-offset-zinc-950 ${p.pressed ? "ring-indigo-500" : "ring-transparent"} ${p.alert && !p.pressed ? "shadow-[0_0_0_1px_rgb(220_38_38/0.35)]" : "hover:shadow-md"}`}
              >
                {p.card}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid content-start gap-4 xl:grid-cols-3">
        <section aria-label="Security events" className="grid content-start gap-4 xl:col-span-2">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
            <SecurityFilters
              filters={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(0);
              }}
              total={total}
            />
          </div>
          {loading && events === null ? (
            <SecurityTableSkeleton />
          ) : error && events === null ? (
            <EmptyState
              icon={<ShieldAlert size={20} aria-hidden="true" />}
              title="Couldn't load events"
              description={error}
              action={
                <Button type="button" size="sm" variant="secondary" onClick={retry}>
                  Retry
                </Button>
              }
            />
          ) : events !== null && events.length === 0 ? (
            <EmptyState
              icon={<Search size={20} aria-hidden="true" />}
              title={hasActiveFilters ? "No events match" : "No security events yet"}
              description={
                hasActiveFilters
                  ? "Try a different search or clear the filters."
                  : "Logins, revocations, and denials appear here once recorded."
              }
              action={
                hasActiveFilters ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => preset({})}>
                    Clear search and filters
                  </Button>
                ) : undefined
              }
            />
          ) : events !== null ? (
            <>
              <div aria-busy={loading} className={loading ? "opacity-60" : undefined}>
                <SecurityTable events={events} onView={(e) => setDrawerId(e.id)} />
              </div>
              <nav
                aria-label="Event pages"
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
        </section>

        <div className="grid content-start gap-4">
          <section aria-label="Recent admin actions" className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-900 dark:bg-zinc-900/40">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Admin actions
              </h2>
              <Link
                href="/admin/audit-logs"
                className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
              >
                Full log
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="px-4 py-2">
              {!adminActions ? (
                <p className="py-3 text-xs text-zinc-500" role="status">Loading…</p>
              ) : adminActions.length === 0 ? (
                <p className="py-3 text-xs text-zinc-500">No privileged actions recorded yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {adminActions.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono">{a.action}</span>
                        <span className="block truncate text-[11px] text-zinc-500">{a.actorName}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(a.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="Blocked requests" className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-900 dark:bg-zinc-900/40">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Blocked requests
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Denied admin attempts</p>
            </div>
            <div className="px-4 py-2">
              {!blocked ? (
                <p className="py-3 text-xs text-zinc-500" role="status">Loading…</p>
              ) : blocked.length === 0 ? (
                <p className="py-3 text-xs text-zinc-500">No denied admin attempts recorded.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {blocked.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 py-1.5 text-xs">
                      <Badge size="sm" tone="danger">DENIED</Badge>
                      <span className="min-w-0 flex-1 truncate font-mono">{b.action}</span>
                      <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(b.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="py-2 text-[11px] text-zinc-500">
                Denied attempts plus rate-limit and permission events in the stream above.
              </p>
            </div>
          </section>
        </div>
      </div>

      <SecurityDetailsDrawer eventId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
