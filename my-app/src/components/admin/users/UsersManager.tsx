"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { usePermissions } from "@/src/components/auth/Can";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useToast } from "@/src/components/ui/toast";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserEditDialog } from "./UserEditDialog";
import { UserFilters, type UserFilterState } from "./UserFilters";
import { UserRoleDialog } from "./UserRoleDialog";
import { UserSearch } from "./UserSearch";
import { UserStatusDialog } from "./UserStatusDialog";
import { UserTable, UserTableSkeleton, type UserCapabilities } from "./UserTable";
import {
  STATUS_FOR_ACTION,
  changeRole,
  changeStatus,
  fetchUsers,
  patchUserName,
  type AdminUser,
  type StatusAction,
  type UserSortKey,
} from "./types";

const DEFAULT_FILTERS: UserFilterState = {
  status: "all",
  role: "all",
  sort: "createdAt",
  dir: "desc",
  limit: 25,
};

/**
 * Full user management workspace: search, filter, sort, paginate, inspect,
 * and every lifecycle mutation with confirmation. Server enforces all
 * permissions and writes the audit trail; `Can`-derived flags only gate
 * display.
 */
export function UsersManager({
  role,
  initialQuery = "",
}: {
  role: PlatformRole | null;
  /** Deep link (e.g. from the command palette): prefill search. */
  initialQuery?: string;
}) {
  const { toast } = useToast();
  const { can } = usePermissions(role);
  const caps: UserCapabilities & { revoke: boolean } = {
    edit: can("users.update"),
    suspend: can("users.suspend"),
    danger: can("users.delete"),
    role: can("users.update"),
    revoke: can("users.view"),
  };

  const [q, setQ] = useState(initialQuery);
  const [searchKey, setSearchKey] = useState(0);
  const [filters, setFilters] = useState<UserFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ user: AdminUser; action: StatusAction } | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);

  // Fetch-only effect: stale rows stay visible while the next page loads.
  useEffect(() => {
    let cancelled = false;
    fetchUsers({
      q,
      status: filters.status,
      role: filters.role,
      sort: filters.sort,
      dir: filters.dir,
      limit: filters.limit,
      offset: page * filters.limit,
    })
      .then((json) => {
        if (cancelled) return;
        setUsers(json.users);
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

  function applyRow(user: AdminUser) {
    setUsers((prev) => (prev ? prev.map((u) => (u.id === user.id ? user : u)) : prev));
    if (drawerId === user.id) setDrawerKey((k) => k + 1);
  }

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  function onSort(key: UserSortKey) {
    setFilters((f) => {
      if (f.sort === key) return { ...f, dir: f.dir === "asc" ? "desc" : "asc" };
      return { ...f, sort: key, dir: key === "name" || key === "email" ? "asc" : "desc" };
    });
    setPage(0);
  }

  async function confirmStatus(reason: string | undefined) {
    if (!statusTarget) return;
    const { user, action } = statusTarget;
    const updated = await changeStatus(user.id, STATUS_FOR_ACTION[action], reason);
    applyRow(updated.user);
    toast(
      action === "delete"
        ? "User deleted."
        : action === "ban"
          ? "User banned."
          : action === "suspend"
            ? "User suspended."
            : "Account restored.",
      { tone: "success" },
    );
  }

  async function confirmRole(next: PlatformRole | null) {
    if (!roleTarget) return;
    const updated = await changeRole(roleTarget.id, next);
    applyRow(updated.user);
    toast("Role updated.", { tone: "success" });
  }

  async function confirmEdit(name: string) {
    if (!editTarget) return;
    const updated = await patchUserName(editTarget.id, name);
    applyRow(updated.user);
    toast("Name updated.", { tone: "success" });
  }

  const pages = total === null ? 1 : Math.max(1, Math.ceil(total / filters.limit));
  const safePage = Math.min(page, pages - 1);
  const from = total === 0 || total === null ? 0 : safePage * filters.limit + 1;
  const to = total === null ? 0 : Math.min(total, (safePage + 1) * filters.limit);
  const hasActiveFilters = q.trim() !== "" || filters.status !== "all" || filters.role !== "all";

  return (
    <div className="grid content-start gap-4">
      <section
        aria-label="Find and filter users"
        className="grid gap-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <UserSearch
          key={searchKey}
          value={q}
          onChange={(next) => {
            setQ(next);
            setPage(0);
          }}
        />
        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <UserFilters
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(0);
            }}
            total={total}
          />
        </div>
      </section>

      {loading && users === null ? (
        <UserTableSkeleton />
      ) : error && users === null ? (
        <EmptyState
          icon={<Users size={20} aria-hidden="true" />}
          title="Couldn't load users"
          description={error}
          action={
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : users !== null && users.length === 0 ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title={hasActiveFilters ? "No users match" : "No users yet"}
          description={
            hasActiveFilters
              ? "Try a different search or clear the filters."
              : "Accounts appear here after registration."
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
      ) : users !== null ? (
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
            <UserTable
              users={users}
              sort={filters.sort}
              dir={filters.dir}
              onSort={onSort}
              can={caps}
              onView={(u) => setDrawerId(u.id)}
              onEdit={setEditTarget}
              onStatus={(u, action) => setStatusTarget({ user: u, action })}
              onRole={setRoleTarget}
            />
          </div>
          <nav
            aria-label="User pages"
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

      <UserDetailsDrawer
        key={drawerKey}
        userId={drawerId}
        can={caps}
        actorRole={role}
        onClose={() => setDrawerId(null)}
        onChanged={applyRow}
        onStatus={(u, action) => setStatusTarget({ user: u, action })}
        onRole={setRoleTarget}
      />
      {editTarget ? (
        <UserEditDialog user={editTarget} onClose={() => setEditTarget(null)} onConfirm={confirmEdit} />
      ) : null}
      {statusTarget ? (
        <UserStatusDialog
          user={statusTarget.user}
          action={statusTarget.action}
          onClose={() => setStatusTarget(null)}
          onConfirm={confirmStatus}
        />
      ) : null}
      {roleTarget ? (
        <UserRoleDialog
          user={roleTarget}
          actorRole={role}
          onClose={() => setRoleTarget(null)}
          onConfirm={confirmRole}
        />
      ) : null}
    </div>
  );
}
