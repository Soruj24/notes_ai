"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import type { AuditEntry } from "./types";

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

/** Append-only trail table: Timestamp, Admin, Action, Resource, ID, IP, UA, Result. */
export function AuditTable({
  entries,
  onView,
}: {
  entries: AuditEntry[];
  onView: (entry: AuditEntry) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[64rem] border-collapse text-sm">
        <caption className="sr-only">Admin audit log</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            <th scope="col" className="px-4 py-2.5 font-medium">Timestamp</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Admin</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Resource</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Resource ID</th>
            <th scope="col" className="px-4 py-2.5 font-medium">IP</th>
            <th scope="col" className="px-4 py-2.5 font-medium">User Agent</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Result</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {entries.map((e) => {
            const denied = e.result === "denied";
            return (
            <tr
              key={e.id}
              className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 ${denied ? "bg-red-50/40 dark:bg-red-950/20" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {formatDateTime(e.timestamp)}
              </td>
              <td className="max-w-44 px-4 py-2.5">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{e.actorName}</p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {[e.actorEmail, e.actorRole].filter(Boolean).join(" · ")}
                </p>
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {e.action}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{e.resourceType ?? "—"}</td>
              <td className="max-w-40 truncate px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400" title={e.resourceId ?? undefined}>
                {e.resourceId ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {e.ipAddress ?? "—"}
              </td>
              <td className="max-w-48 truncate px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400" title={e.userAgent ?? undefined}>
                {e.userAgent ?? "—"}
              </td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={e.result === "denied" ? "danger" : "success"}>
                  {e.result === "denied" ? "DENIED" : "SUCCESS"}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-right">
                <Button type="button" size="sm" variant="ghost" onClick={() => onView(e)}>
                  View
                </Button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Table-shaped skeleton for the list loading state. */
export function AuditTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading audit log"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading audit log…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
