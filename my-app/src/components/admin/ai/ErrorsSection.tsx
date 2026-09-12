"use client";

import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { AISection, SectionError, SectionSkeleton } from "./Section";
import { useAdminFetch } from "./useAdminFetch";
import type { AIErrorOverview } from "./types";

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Section 9 — Errors: provider status, failed runs, rate-limit events. */
export function ErrorsSection() {
  const { data, loading, error, retry } = useAdminFetch<AIErrorOverview>("/api/admin/ai/errors");

  return (
    <AISection
      title="Errors"
      description="Failed assistant runs (empty responses), provider state, and rate-limit events."
      action={
        data ? (
          <Badge size="sm" tone={data.provider.reachable ? "success" : "danger"}>
            {data.provider.reachable ? "Provider OK" : "Provider down"}
          </Badge>
        ) : undefined
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : data.failedRunsTotal === 0 && data.rateLimited7d === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={20} aria-hidden="true" />}
          title="No AI errors recorded"
          description="Failed runs and rate-limit events appear here."
        />
      ) : (
        <div className="grid gap-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
            <div className="flex gap-1.5">
              <dt>Failed runs (all time):</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.failedRunsTotal.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Rate-limited (7d):</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.rateLimited7d.toLocaleString()}
              </dd>
            </div>
          </dl>
          {data.failedRuns.length ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Recent failed runs</h3>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {data.failedRuns.map((f, i) => (
                  <li key={`${f.conversationId}-${i}`} className="flex items-center gap-2 py-1.5 text-xs">
                    <TriangleAlert size={13} aria-hidden="true" className="shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1 truncate">{f.title}</span>
                    {f.model ? (
                      <span className="hidden shrink-0 font-mono text-[11px] text-zinc-500 sm:block">{f.model}</span>
                    ) : null}
                    <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(f.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.rateLimited.length ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Rate-limit events</h3>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {data.rateLimited.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-1.5 text-xs">
                    <Badge size="sm" tone="warning">
                      rate.limited
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-zinc-500">
                      {[e.email, e.ipAddress].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </AISection>
  );
}
