"use client";

import { ScrollText } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { useAdminFetch } from "@/src/components/admin/ai/useAdminFetch";
import { SectionError, SectionSkeleton } from "@/src/components/admin/ai/Section";
import type { HistoryEntry } from "./types";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value || "—";
  return JSON.stringify(value);
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Change history: settings audit trail, newest first. */
export function HistoryPanel({ keyPrefix }: { keyPrefix?: string }) {
  const { data, loading, error, retry } = useAdminFetch<{ history: HistoryEntry[] }>(
    "/api/admin/settings/history",
  );
  const history = (data?.history ?? []).filter((h) => !keyPrefix || h.key.startsWith(keyPrefix));

  if (loading) return <SectionSkeleton rows={5} />;
  if (error || !data) return <SectionError message={error ?? "No data returned."} onRetry={retry} />;
  if (!history.length) {
    return (
      <EmptyState
        icon={<ScrollText size={20} aria-hidden="true" />}
        title="No changes yet"
        description="Setting writes and resets appear here with before/after values."
        action={
          <Button type="button" size="sm" variant="secondary" onClick={retry}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">Settings change history</caption>
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
            <th scope="col" className="px-4 py-2.5 font-medium">When</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Setting</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Change</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Actor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {history.map((h) => (
            <tr key={h.id}>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                {formatDateTime(h.timestamp)}
              </td>
              <td className="px-4 py-2.5">
                <p className="truncate font-mono text-xs">{h.key}</p>
                <p className="text-[11px] text-zinc-500">{h.action}</p>
              </td>
              <td className="max-w-72 px-4 py-2.5 text-xs">
                <span className="block truncate text-zinc-500">{formatValue(h.before)} →</span>
                <span className="block truncate font-medium">{formatValue(h.after)}</span>
              </td>
              <td className="px-4 py-2.5">
                <Badge size="sm" tone="neutral">
                  {h.actorRole ?? h.actorId.slice(0, 8)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
