"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Ellipsis,
  FolderKanban,
  ListTodo,
  NotebookPen,
  Target,
  type LucideIcon,
} from "lucide-react";
import { ENTITY_CONFIG, type ModEntity } from "@/src/lib/moderation";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Popover } from "@/src/components/ui/popover";
import { cx, focusRing } from "@/src/lib/utils/cx";
import {
  availableActions,
  canPerform,
  type ModAction,
  type ModCaps,
  type ModItem,
  type SortDir,
} from "./types";

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["trashed", "cancelled"].includes(status)) return "danger";
  if (["archived", "abandoned"].includes(status)) return "warning";
  if (["done", "achieved", "completed", "confirmed", "active", "todo"].includes(status)) return "success";
  return "neutral";
}

const entityIcons: Record<ModEntity, LucideIcon> = {
  notes: NotebookPen,
  tasks: ListTodo,
  events: CalendarDays,
  projects: FolderKanban,
  goals: Target,
};

interface RowMenuProps {
  entity: ModEntity;
  item: ModItem;
  caps: ModCaps;
  onView: (item: ModItem) => void;
  onLifecycle: (item: ModItem, action: ModAction) => void;
}

function RowMenu({ entity, item, caps, onView, onLifecycle }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const config = ENTITY_CONFIG[entity];
  const itemCls =
    "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-900";
  const dangerCls =
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
        aria-label={`Actions for ${item.title}`}
      >
        <Ellipsis size={16} aria-hidden="true" />
      </Button>
      <Popover open={open} onClose={close} label={`Actions for ${item.title}`} align="right" widthClass="w-48">
        <div className="grid gap-0.5 p-1.5">
          <button
            type="button"
            className={itemCls}
            onClick={() => {
              close();
              onView(item);
            }}
          >
            Inspect
          </button>
          {availableActions(entity, item.status).map((action) => {
            if (!canPerform(caps, entity, action, item.status)) return null;
            const irreversible = action === "delete" || action === "purge";
            return (
              <button
                key={action}
                type="button"
                className={irreversible ? dangerCls : itemCls}
                onClick={() => {
                  close();
                  onLifecycle(item, action);
                }}
              >
                {config.verbs[action]}…
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

/** Server-sorted content table: Title, Workspace, Owner, Status, Updated, Actions. */
export function ModerationTable({
  entity,
  items,
  sort,
  dir,
  onSort,
  caps,
  onView,
  onLifecycle,
}: {
  entity: ModEntity;
  items: ModItem[];
  sort: string;
  dir: SortDir;
  onSort: (key: string) => void;
  caps: ModCaps;
  onView: (item: ModItem) => void;
  onLifecycle: (item: ModItem, action: ModAction) => void;
}) {
  const config = ENTITY_CONFIG[entity];
  const headers: Array<{ key: string; label: string; sortable: boolean }> = [
    { key: "title", label: "Title", sortable: true },
    ...(entity === "events"
      ? [{ key: "startsAt", label: "Starts", sortable: true }]
      : []),
  ];

  const EntityIcon = entityIcons[entity];
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption className="sr-only">{config.label} across workspaces</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            {headers.map((h) => {
              const active = sort === h.key;
              return (
                <th
                  key={h.key}
                  scope="col"
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                  className="px-4 py-2.5 font-medium"
                >
                  <button
                    type="button"
                    onClick={() => onSort(h.key)}
                    className={cx(
                      "inline-flex cursor-pointer items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100",
                      focusRing,
                      "rounded",
                    )}
                    aria-label={`Sort by ${h.label}${active ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
                  >
                    {h.label}
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
            })}
            <th scope="col" className="px-4 py-2.5 font-medium">
              Workspace
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Owner
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Updated
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60">
              <td className="px-4 py-2.5">
                <span className="flex max-w-60 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400"
                  >
                    <EntityIcon size={14} />
                  </span>
                  <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </span>
                </span>
              </td>
              {entity === "events" ? (
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-zinc-500">
                  {formatDate(item.startsAt)}
                </td>
              ) : null}
              <td className="max-w-44 truncate px-4 py-2.5 text-xs text-zinc-500">{item.workspaceName}</td>
              <td className="max-w-40 truncate px-4 py-2.5 text-xs text-zinc-500">{item.ownerName}</td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={statusTone(item.status)}>
                  {item.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap text-zinc-500">
                {formatDate(item.updatedAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onView(item)}>
                    View
                  </Button>
                  <RowMenu entity={entity} item={item} caps={caps} onView={onView} onLifecycle={onLifecycle} />
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
export function ModerationTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
