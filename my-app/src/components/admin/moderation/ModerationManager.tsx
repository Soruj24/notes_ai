"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ENTITY_CONFIG, type ModAction, type ModEntity } from "@/src/lib/moderation";
import { usePermissions } from "@/src/components/auth/Can";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useToast } from "@/src/components/ui/toast";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { InspectDrawer } from "./InspectDrawer";
import { LifecycleDialog } from "./LifecycleDialog";
import { ModerationFilters, type ModFilterState } from "./ModerationFilters";
import { ModerationSearch } from "./ModerationSearch";
import { ModerationTable, ModerationTableSkeleton } from "./ModerationTable";
import {
  fetchContent,
  runLifecycle,
  type ModCaps,
  type ModItem,
} from "./types";

/**
 * Generic moderation workspace: search, filter, sort, paginate, inspect,
 * and lifecycle actions with confirmation. Content is never edited —
 * only lifecycle flags and deletion, every mutation audited server-side.
 */
export function ModerationManager({ entity, role }: { entity: ModEntity; role: PlatformRole | null }) {
  const config = ENTITY_CONFIG[entity];
  const { toast } = useToast();
  const { can } = usePermissions(role);
  const caps: ModCaps = {
    moderate: can(`${config.permBase}.moderate`),
    destroy: can(`${config.permBase}.delete`),
  };

  const [q, setQ] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [filters, setFilters] = useState<ModFilterState>({
    status: "all",
    sort: config.defaultSort,
    dir: entity === "events" ? "asc" : "desc",
    limit: 25,
  });
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ModItem[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);
  const [target, setTarget] = useState<{ item: ModItem; action: ModAction } | null>(null);

  // Fetch-only effect: stale rows stay visible while the next page loads.
  useEffect(() => {
    let cancelled = false;
    fetchContent(entity, {
      q,
      status: filters.status,
      sort: filters.sort,
      dir: filters.dir,
      limit: filters.limit,
      offset: page * filters.limit,
    })
      .then((json) => {
        if (cancelled) return;
        setItems(json.items);
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
  }, [entity, q, filters, page, attempt]);

  function applyResult(updated: ModItem | null, purged: boolean, id: string) {
    if (purged) {
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
      setTotal((t) => (t === null ? t : Math.max(0, t - 1)));
    } else if (updated) {
      setItems((prev) => (prev ? prev.map((i) => (i.id === id ? updated : i)) : prev));
    }
    if (drawerId === id) {
      if (purged) setDrawerId(null);
      else setDrawerKey((k) => k + 1);
    }
  }

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  function onSort(key: string) {
    setFilters((f) => {
      if (f.sort === key) return { ...f, dir: f.dir === "asc" ? "desc" : "asc" };
      return { ...f, sort: key, dir: key === "title" ? "asc" : "desc" };
    });
    setPage(0);
  }

  async function confirmLifecycle(reason: string | undefined) {
    if (!target) return;
    const { item, action } = target;
    const result = await runLifecycle(entity, item.id, action, reason);
    applyResult(result.item, result.purged, item.id);
    const past: Record<string, string> = {
      Archive: "archived",
      Restore: "restored",
      Trash: "trashed",
      Cancel: "cancelled",
      Abandon: "abandoned",
      Delete: "deleted",
      Purge: "purged",
      Reactivate: "reactivated",
    };
    toast(
      result.purged
        ? `${config.singular} permanently deleted.`
        : `${config.singular} ${past[config.verbs[action]] ?? "updated"}.`,
      { tone: "success" },
    );
  }

  const pages = total === null ? 1 : Math.max(1, Math.ceil(total / filters.limit));
  const safePage = Math.min(page, pages - 1);
  const from = total === 0 || total === null ? 0 : safePage * filters.limit + 1;
  const to = total === null ? 0 : Math.min(total, (safePage + 1) * filters.limit);
  const hasActiveFilters = q.trim() !== "" || filters.status !== "all";

  return (
    <div className="grid content-start gap-4">
      <section
        aria-label={`Find and filter ${config.label.toLowerCase()}`}
        className="grid gap-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <ModerationSearch
          key={searchKey}
          value={q}
          onChange={(next) => {
            setQ(next);
            setPage(0);
          }}
          entityLabel={config.label.toLowerCase()}
        />
        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <ModerationFilters
            entity={entity}
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(0);
            }}
            total={total}
          />
        </div>
      </section>

      {loading && items === null ? (
        <ModerationTableSkeleton />
      ) : error && items === null ? (
        <EmptyState
          title={`Couldn't load ${config.label.toLowerCase()}`}
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
          title={hasActiveFilters ? `No ${config.label.toLowerCase()} match` : `No ${config.label.toLowerCase()} yet`}
          description={hasActiveFilters ? "Try a different search or clear the filters." : undefined}
          action={
            hasActiveFilters ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setSearchKey((k) => k + 1);
                  setFilters({ status: "all", sort: config.defaultSort, dir: "desc", limit: 25 });
                  setPage(0);
                }}
              >
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      ) : items !== null ? (
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
            <ModerationTable
              entity={entity}
              items={items}
              sort={filters.sort}
              dir={filters.dir}
              onSort={onSort}
              caps={caps}
              onView={(item) => setDrawerId(item.id)}
              onLifecycle={(item, action) => setTarget({ item, action })}
            />
          </div>
          <nav
            aria-label={`${config.label} pages`}
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

      <InspectDrawer
        key={drawerKey}
        entity={entity}
        itemId={drawerId}
        caps={caps}
        onClose={() => setDrawerId(null)}
        onLifecycle={(item, action) => setTarget({ item, action })}
      />
      {target ? (
        <LifecycleDialog
          entity={entity}
          item={target.item}
          action={target.action}
          onClose={() => setTarget(null)}
          onConfirm={confirmLifecycle}
        />
      ) : null}
    </div>
  );
}
