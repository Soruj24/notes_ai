"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import type { InboxItem, Priority, Severity } from "./types";

const severityTone: Record<Severity, "neutral" | "warning" | "danger"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

const priorityTone: Record<Priority, "neutral" | "accent" | "warning" | "danger"> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Inbox table: Priority, Title, Source, Severity, Time, Read state. */
export function NotificationsTable({
  items,
  onView,
  onMarkRead,
}: {
  items: InboxItem[];
  onView: (item: InboxItem) => void;
  onMarkRead: (item: InboxItem) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption className="sr-only">Admin notifications</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Title</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {items.map((item) => (
            <tr
              key={item.id}
              className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 ${item.read ? "" : "bg-indigo-50/40 dark:bg-indigo-950/20"}`}
            >
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    title={item.read ? "Read" : "Unread"}
                    className={`h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-zinc-200 dark:bg-zinc-800" : "bg-indigo-500"}`}
                  />
                  <Badge size="sm" tone={priorityTone[item.priority]}>
                    {item.priority.toUpperCase()}
                  </Badge>
                </span>
              </td>
              <td className="max-w-72 px-4 py-2.5">
                <p className={`truncate text-zinc-900 dark:text-zinc-100 ${item.read ? "" : "font-semibold"}`}>{item.title}</p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{item.body}</p>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{item.source}</td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={severityTone[item.severity]}>
                  {item.severity}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                {formatDateTime(item.createdAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                <span className="inline-flex gap-1">
                  {!item.read ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => onMarkRead(item)}>
                      Mark read
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" onClick={() => onView(item)}>
                    View
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Table-shaped skeleton for the loading state. */
export function NotificationsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading notifications"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading notifications…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
