"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePermissions } from "@/src/components/auth/Can";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useToast } from "@/src/components/ui/toast";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { WorkspaceDetailsDrawer } from "./WorkspaceDetailsDrawer";
import { WorkspaceFilters, type WorkspaceFilterState } from "./WorkspaceFilters";
import { WorkspaceSearch } from "./WorkspaceSearch";
import { WorkspaceStatusDialog } from "./WorkspaceStatusDialog";
import { WorkspaceTable, WorkspaceTableSkeleton, type WorkspaceCapabilities } from "./WorkspaceTable";
import {
  STATUS_FOR_ACTION,
  changeWorkspaceStatus,
  fetchWorkspaces,
  type AdminWorkspace,
  type WorkspaceSortKey,
  type WorkspaceStatusAction,
} from "./types";

const DEFAULT_FILTERS: WorkspaceFilterState = {
  status: "all",
  sort: "createdAt",
  dir: "desc",
  limit: 25,
};

/**
 * Workspace operations workspace: search, filter, sort, paginate, inspect,
 * and lifecycle mutations with confirmation. Status changes are enforced
 * by the service layer (requireMembership / requireWritableMembership) —
 * the UI only triggers audited service calls.
 */
export function WorkspacesManager({
  role,
  initialQuery = "",
}: {
  role: PlatformRole | null;
  /** Deep link (e.g. from the command palette): prefill search. */
  initialQuery?: string;
}) {
  const { toast } = useToast();
  const { can } = usePermissions(role);
  const caps: WorkspaceCapabilities = {
    suspend: can("workspaces.suspend"),
    danger: can("workspaces.delete"),
  };

  const [q, setQ] = useState(initialQuery);
  const [searchKey, setSearchKey] = useState(0);
  const [filters, setFilters] = useState<WorkspaceFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState<{
    workspace: AdminWorkspace;
    action: WorkspaceStatusAction;
  } | null>(null);

  // Fetch-only effect: stale rows stay visible while the next page loads.
  useEffect(() => {
    let cancelled = false;
    fetchWorkspaces({
      q,
      status: filters.status,
      sort: filters.sort,
      dir: filters.dir,
      limit: filters.limit,
      offset: page * filters.limit,
    })
      .then((json) => {
        if (cancelled) return;
        setWorkspaces(json.workspaces);
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
  }, [q, filters, page, attempt]);

  function applyRow(w: AdminWorkspace) {
    setWorkspaces((prev) => (prev ? prev.map((row) => (row.id === w.id ? { ...row, ...w } : row)) : prev));
    if (drawerId === w.id) setDrawerKey((k) => k + 1);
  }

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  function onSort(key: WorkspaceSortKey) {
    setFilters((f) => {
      if (f.sort === key) return { ...f, dir: f.dir === "asc" ? "desc" : "asc" };
      return { ...f, sort: key, dir: key === "name" ? "asc" : "desc" };
    });
    setPage(0);
  }

  async function confirmStatus(reason: string | undefined) {
    if (!statusTarget) return;
    const { workspace, action } = statusTarget;
    const updated = await changeWorkspaceStatus(workspace.id, STATUS_FOR_ACTION[action], reason);
    applyRow({
      ...workspace,
      status: updated.workspace.status,
      updatedAt: updated.workspace.updatedAt,
    });
    toast(
      action === "delete"
        ? "Workspace deleted."
        : action === "archive"
          ? "Workspace archived."
          : action === "suspend"
            ? "Workspace suspended."
            : "Workspace restored.",
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
        aria-label="Find and filter workspaces"
        className="grid gap-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <WorkspaceSearch
          key={searchKey}
          value={q}
          onChange={(next) => {
            setQ(next);
            setPage(0);
          }}
        />
        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <WorkspaceFilters
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(0);
            }}
            total={total}
          />
        </div>
      </section>

      {loading && workspaces === null ? (
        <WorkspaceTableSkeleton />
      ) : error && workspaces === null ? (
        <EmptyState
          icon={<Briefcase size={20} aria-hidden="true" />}
          title="Couldn't load workspaces"
          description={error}
          action={
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : workspaces !== null && workspaces.length === 0 ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title={hasActiveFilters ? "No workspaces match" : "No workspaces yet"}
          description={
            hasActiveFilters
              ? "Try a different search or clear the filters."
              : "Workspaces appear here after users sign up."
          }
          action={
            hasActiveFilters ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setSearchKey((k) => k + 1);
                  setFilters(DEFAULT_FILTERS);
                  setPage(0);
                }}
              >
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      ) : workspaces !== null ? (
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
            <WorkspaceTable
              workspaces={workspaces}
              sort={filters.sort}
              dir={filters.dir}
              onSort={onSort}
              can={caps}
              onView={(w) => setDrawerId(w.id)}
              onStatus={(w, action) => setStatusTarget({ workspace: w, action })}
            />
          </div>
          <nav
            aria-label="Workspace pages"
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

      <WorkspaceDetailsDrawer
        key={drawerKey}
        workspaceId={drawerId}
        can={caps}
        onClose={() => setDrawerId(null)}
        onStatus={(w, action) => setStatusTarget({ workspace: w, action })}
      />
      {statusTarget ? (
        <WorkspaceStatusDialog
          workspace={statusTarget.workspace}
          action={statusTarget.action}
          onClose={() => setStatusTarget(null)}
          onConfirm={confirmStatus}
        />
      ) : null}
    </div>
  );
}
