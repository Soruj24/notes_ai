"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from "lucide-react";
import { Avatar } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Popover } from "@/src/components/ui/popover";
import { cx, focusRing } from "@/src/lib/utils/cx";
import type { UserStatus } from "@/src/lib/db/admin-enums";
import type { AdminUser, SortDir, StatusAction, UserSortKey } from "./types";

export interface UserCapabilities {
  edit: boolean;
  suspend: boolean;
  danger: boolean;
  role: boolean;
}

const roleTone: Record<string, "accent" | "warning" | "neutral"> = {
  SUPER_ADMIN: "accent",
  ADMIN: "accent",
  MODERATOR: "warning",
};

const statusTone: Record<UserStatus, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  BANNED: "danger",
  DELETED: "danger",
};

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SortHeader({
  label,
  sortKey,
  sort,
  dir,
  onSort,
}: {
  label: string;
  sortKey: UserSortKey;
  sort: UserSortKey;
  dir: SortDir;
  onSort: (key: UserSortKey) => void;
}) {
  const active = sort === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className="px-4 py-2.5 font-medium"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100",
          focusRing,
          "rounded",
        )}
        aria-label={`Sort by ${label}${active ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={12} aria-hidden="true" />
          ) : (
            <ArrowDown size={12} aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={12} aria-hidden="true" className="opacity-40" />
        )}
      </button>
    </th>
  );
}

interface RowMenuProps {
  user: AdminUser;
  can: UserCapabilities;
  onView: (u: AdminUser) => void;
  onEdit: (u: AdminUser) => void;
  onStatus: (u: AdminUser, action: StatusAction) => void;
  onRole: (u: AdminUser) => void;
}

function RowMenu({ user, can, onView, onEdit, onStatus, onRole }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const item =
    "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-900";
  const dangerItem =
    "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-[13px] text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-300 dark:hover:bg-red-950";

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Actions for ${user.email}`}
      >
        <Ellipsis size={16} aria-hidden="true" />
      </Button>
      <Popover open={open} onClose={close} label={`Actions for ${user.email}`} align="right" widthClass="w-48">
        <div className="grid gap-0.5 p-1.5">
          <button
            type="button"
            className={item}
            onClick={() => {
              close();
              onView(user);
            }}
          >
            View details
          </button>
          {can.edit ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onEdit(user);
              }}
            >
              Edit name
            </button>
          ) : null}
          {can.role ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onRole(user);
              }}
            >
              Change role…
            </button>
          ) : null}
          {can.suspend && user.status === "ACTIVE" ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onStatus(user, "suspend");
              }}
            >
              Suspend…
            </button>
          ) : null}
          {can.suspend && user.status === "SUSPENDED" ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onStatus(user, "unsuspend");
              }}
            >
              Unsuspend…
            </button>
          ) : null}
          {can.danger && (user.status === "BANNED" || user.status === "DELETED") ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onStatus(user, "unsuspend");
              }}
            >
              Restore to active…
            </button>
          ) : null}
          {can.danger && user.status !== "BANNED" && user.status !== "DELETED" ? (
            <button
              type="button"
              className={dangerItem}
              onClick={() => {
                close();
                onStatus(user, "ban");
              }}
            >
              Ban…
            </button>
          ) : null}
          {can.danger && user.status !== "DELETED" ? (
            <button
              type="button"
              className={dangerItem}
              onClick={() => {
                close();
                onStatus(user, "delete");
              }}
            >
              Delete…
            </button>
          ) : null}
        </div>
      </Popover>
    </div>
  );
}

/** Server-sorted user table. Columns: Name, Email, Role, Status, Created, Last Active, Actions. */
export function UserTable({
  users,
  sort,
  dir,
  onSort,
  can,
  onView,
  onEdit,
  onStatus,
  onRole,
}: {
  users: AdminUser[];
  sort: UserSortKey;
  dir: SortDir;
  onSort: (key: UserSortKey) => void;
  can: UserCapabilities;
  onView: (u: AdminUser) => void;
  onEdit: (u: AdminUser) => void;
  onStatus: (u: AdminUser, action: StatusAction) => void;
  onRole: (u: AdminUser) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption className="sr-only">Platform users</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            <SortHeader label="Name" sortKey="name" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader label="Email" sortKey="email" sort={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <SortHeader label="Created" sortKey="createdAt" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader label="Last active" sortKey="lastActiveAt" sort={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {users.map((u) => (
            <tr key={u.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60">
              <td className="px-4 py-2.5">
                <span className="flex max-w-52 items-center gap-2.5">
                  <Avatar name={u.name || u.email} size="xs" />
                  <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {u.name}
                  </span>
                </span>
              </td>
              <td className="max-w-60 truncate px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{u.email}</td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={u.role ? (roleTone[u.role] ?? "neutral") : "neutral"}>
                  {u.role ?? "USER"}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={statusTone[u.status]}>
                  {u.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap text-zinc-500">
                {formatDate(u.createdAt)}
              </td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap text-zinc-500">
                {formatDate(u.lastActiveAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onView(u)}>
                    View
                  </Button>
                  <RowMenu
                    user={u}
                    can={can}
                    onView={onView}
                    onEdit={onEdit}
                    onStatus={onStatus}
                    onRole={onRole}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Table-shaped skeleton for the list loading state. */
export function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading users"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading users…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
