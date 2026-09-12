"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import type { SecurityEventView, SecuritySeverity } from "./types";

const severityTone: Record<SecuritySeverity, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
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

/** Event stream table: Time, Type, Severity, Actor, Details. */
export function SecurityTable({
  events,
  onView,
}: {
  events: SecurityEventView[];
  onView: (event: SecurityEventView) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <table className="w-full min-w-[48rem] border-collapse text-sm">
        <caption className="sr-only">Security events</caption>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Actor</th>
            <th scope="col" className="px-4 py-2.5 font-medium">IP</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {events.map((e) => {
            const critical = e.severity === "CRITICAL" || e.severity === "HIGH";
            return (
            <tr
              key={e.id}
              className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 ${critical ? "bg-red-50/40 dark:bg-red-950/20" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {formatDateTime(e.createdAt)}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {e.type}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone={severityTone[e.severity]}>
                  {e.severity}
                </Badge>
              </td>
              <td className="max-w-52 truncate px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                {e.email ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {e.ipAddress ?? "—"}
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

/** Table-shaped skeleton for the loading state. */
export function SecurityTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading security events"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">Loading security events…</span>
      <div className="grid gap-px" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50 dark:bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
