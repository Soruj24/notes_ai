"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Popover } from "@/src/components/ui/popover";
import { cx, focusRing } from "@/src/lib/utils/cx";
import type { WorkspaceStatus } from "@/src/lib/db/enums";
import type { AdminWorkspace, SortDir, WorkspaceSortKey, WorkspaceStatusAction } from "./types";

export interface WorkspaceCapabilities {
  suspend: boolean;
  danger: boolean;
}

const statusTone: Record<WorkspaceStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
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
  sortKey: WorkspaceSortKey;
  sort: WorkspaceSortKey;
  dir: SortDir;
  onSort: (key: WorkspaceSortKey) => void;
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
  workspace: AdminWorkspace;
  can: WorkspaceCapabilities;
  onView: (w: AdminWorkspace) => void;
  onStatus: (w: AdminWorkspace, action: WorkspaceStatusAction) => void;
}

function RowMenu({ workspace, can, onView, onStatus }: RowMenuProps) {
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
        aria-label={`Actions for ${workspace.name}`}
      >
        <Ellipsis size={16} aria-hidden="true" />
      </Button>
      <Popover open={open} onClose={close} label={`Actions for ${workspace.name}`} align="right" widthClass="w-48">
        <div className="grid gap-0.5 p-1.5">
          <button
            type="button"
            className={item}
            onClick={() => {
              close();
              onView(workspace);
            }}
          >
            Inspect details
          </button>
          {can.suspend && workspace.status === "ACTIVE" ? (
            <>
              <button
                type="button"
                className={item}
                onClick={() => {
                  close();
                  onStatus(workspace, "suspend");
                }}
              >
                Suspend…
              </button>
              <button
                type="button"
                className={item}
                onClick={() => {
                  close();
                  onStatus(workspace, "archive");
                }}
              >
                Archive…
              </button>
            </>
          ) : null}
          {can.suspend && (workspace.status === "SUSPENDED" || workspace.status === "ARCHIVED") ? (
            <button
              type="button"
              className={item}
              onClick={() => {
                close();
                onStatus(workspace, "unsuspend");
              }}
            >
              Restore to active…
            </button>
          ) : null}
          {can.danger && workspace.status !== "DELETED" ? (
            <button
              type="button"
              className={dangerItem}
              onClick={() => {
                close();
                onStatus(workspace, "delete");
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

/** Server-sorted workspace table: Workspace, Owner, Status, Members, Created, Actions. */
export function WorkspaceTable({
  workspaces,
  sort,
  dir,
  onSort,
  can,
  onView,
  onStatus,
}: {
  workspaces: AdminWorkspace[];
  sort: WorkspaceSortKey;
  dir: SortDir;
  onSort: (key: WorkspaceSortKey) => void;
  can: WorkspaceCapabilities;
  onView: (w: AdminWorkspace) => void;
  onStatus: (w: AdminWorkspace, action: WorkspaceStatusAction) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption className="sr-only">Platform workspaces</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            <SortHeader label="Workspace" sortKey="name" sort={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 font-medium">
              Owner
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Members
            </th>
            <SortHeader label="Created" sortKey="createdAt" sort={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {workspaces.map((w) => (
            <tr key={w.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60">
              <td className="px-4 py-2.5">
                <span className="flex max-w-60 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.07] text-xs font-bold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                  >
                    {w.name.charAt(0).toUpperCase() || "W"}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-52 truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {w.name}
                    </span>
                    {w.description ? (
                      <span className="block max-w-52 truncate text-xs text-zinc-500 dark:text-zinc-400">{w.description}</span>
                    ) : null}
                  </span>
                </span>
              </td>
              <td className="max-w-44 truncate px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{w.ownerName}</td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={statusTone[w.status]}>
                  {w.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <Badge size="sm">{w.memberCount}</Badge>
              </td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap text-zinc-500">
                {formatDate(w.createdAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onView(w)}>
                    View
                  </Button>
                  <RowMenu workspace={w} can={can} onView={onView} onStatus={onStatus} />
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
export function WorkspaceTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading workspaces"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading workspaces…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
