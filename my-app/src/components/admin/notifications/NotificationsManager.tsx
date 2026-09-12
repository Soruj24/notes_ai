"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useToast } from "@/src/components/ui/toast";
import { NotificationDrawer } from "./NotificationDrawer";
import { NotificationsFilters } from "./NotificationsFilters";
import { NotificationsTable, NotificationsTableSkeleton } from "./NotificationsTable";
import { useAdminLive } from "./useAdminLive";
import {
  DEFAULT_INBOX_FILTERS,
  inboxApi,
  type InboxFilters,
  type InboxItem,
} from "./types";

/**
 * Staff inbox: filterable stream, detail drawer, acknowledge, mark-all.
 * New items arrive live over the admin socket room (refetch for truth).
 */
export function NotificationsManager() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_INBOX_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [critical, setCritical] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [drawerItem, setDrawerItem] = useState<InboxItem | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  // Live feed: socket event → refetch + announce (stable callbacks).
  const [livePing, setLivePing] = useState(0);
  const onLiveEvent = useCallback(() => {
    refresh();
    setLivePing((n) => n + 1);
  }, [refresh]);
  const { connected } = useAdminLive(onLiveEvent);

  useEffect(() => {
    let cancelled = false;
    inboxApi
      .list({ ...filters, q: debouncedQ }, page * filters.limit)
      .then((json) => {
        if (cancelled) return;
        setItems(json.items);
        setTotal(json.total);
        setUnread(json.unread);
        setCritical(json.items.filter((i) => i.severity === "critical" && !i.read).length);
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

  // Announce live arrivals (not manual refetches).
  useEffect(() => {
    if (!livePing) return;
    toast("New admin notification — list refreshed.", { tone: "info" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePing]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  function applyFilters(next: InboxFilters) {
    setFilters(next);
    setPage(0);
  }

  function applyRead(id: string) {
    setItems((prev) => (prev ? prev.map((i) => (i.id === id ? { ...i, read: true } : i)) : prev));
    setUnread((u) => (u === null ? u : Math.max(0, u - 1)));
    setDrawerItem((d) => (d && d.id === id ? { ...d, read: true } : d));
  }

  async function markAll() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      const { updated } = await inboxApi.markAllRead();
      toast(updated ? `Marked ${updated} as read.` : "Inbox already clear.", { tone: "success" });
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setMarkingAll(false);
    }
  }

  const pages = total === null ? 1 : Math.max(1, Math.ceil(total / filters.limit));
  const safePage = Math.min(page, pages - 1);
  const from = total === 0 || total === null ? 0 : safePage * filters.limit + 1;
  const to = total === null ? 0 : Math.min(total, (safePage + 1) * filters.limit);
  const hasActiveFilters =
    debouncedQ.trim() !== "" ||
    filters.severity !== "all" ||
    filters.priority !== "all" ||
    filters.source !== "all" ||
    filters.read !== "all";

  return (
    <div className="grid content-start gap-4">
      <section
        aria-label="Inbox overview"
        className="flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${critical > 0 ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300" : "bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"}`}
          >
            {critical > 0 ? <BellRing size={18} /> : <Bell size={18} />}
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
              {(unread ?? 0).toLocaleString()} unread
              {critical > 0 ? (
                <span className="ml-1.5 font-medium text-red-600 dark:text-red-400">
                  · {critical.toLocaleString()} critical on this page
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {connected ? "Live — new items arrive instantly" : "Polling — socket unavailable"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={markAll}
          disabled={markingAll || (unread ?? 0) === 0}
          className="shrink-0 sm:ml-auto"
        >
          <CheckCheck size={14} aria-hidden="true" />
          {markingAll ? "Marking…" : "Mark all read"}
        </Button>
      </section>

      <section
        aria-label="Find and filter notifications"
        className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <NotificationsFilters filters={filters} onChange={applyFilters} unread={unread} />
      </section>

      {loading && items === null ? (
        <NotificationsTableSkeleton />
      ) : error && items === null ? (
        <EmptyState
          icon={<Bell size={20} aria-hidden="true" />}
          title="Couldn't load notifications"
          description={error}
          action={
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : items !== null && items.length === 0 ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title={hasActiveFilters ? "No notifications match" : "Inbox clear"}
          description={
            hasActiveFilters
              ? "Try a different search or clear the filters."
              : "Registrations, threats, failures, and changes land here."
          }
          action={
            hasActiveFilters ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => applyFilters(DEFAULT_INBOX_FILTERS)}>
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      ) : items !== null ? (
        <>
          <div aria-busy={loading} className={loading ? "opacity-60" : undefined}>
            <NotificationsTable
              items={items}
              onView={setDrawerItem}
              onMarkRead={async (item) => {
                try {
                  await inboxApi.markRead(item.id);
                  applyRead(item.id);
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
                }
              }}
            />
          </div>
          <nav
            aria-label="Notification pages"
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

      <NotificationDrawer
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onMarkedRead={applyRead}
      />
    </div>
  );
}
