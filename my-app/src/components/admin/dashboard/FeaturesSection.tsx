"use client";

import { ToggleLeft } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { FeatureStatus } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

/** Section 9 — feature status from GET /api/admin/dashboard/features. */
export function FeaturesSection() {
  const { data, loading, error, retry } = useDashboardFetch<FeatureStatus>(
    "/api/admin/dashboard/features",
  );
  const flags = data?.flags ?? [];

  return (
    <DashboardSection
      title="Feature status"
      description="Flag rollup across the platform."
      action={
        <Button type="button" size="sm" variant="outline" href="/admin/features">
          View features
        </Button>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : data.total === 0 ? (
        <EmptyState
          icon={<ToggleLeft size={20} aria-hidden="true" />}
          title="No feature flags yet"
          description="Flags appear here once created — e.g. the registration kill-switch."
        />
      ) : (
        <div>
          <dl className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
            <div className="flex gap-1.5">
              <dt>Total:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.total.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Enabled:</dt>
              <dd className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                {data.enabled.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Disabled:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.disabled.toLocaleString()}
              </dd>
            </div>
          </dl>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {flags.slice(0, 8).map((f) => (
              <li key={f.key} className="flex items-center gap-3 py-2">
                <Badge size="sm" tone={f.enabled ? "success" : "neutral"}>
                  {f.enabled ? "ON" : "OFF"}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {f.key}
                </span>
                <span className="hidden shrink-0 text-[11px] text-zinc-500 sm:block">{f.environment}</span>
              </li>
            ))}
          </ul>
          {flags.length > 8 ? (
            <p className="mt-2 text-xs text-zinc-500">+{(flags.length - 8).toLocaleString()} more in Features.</p>
          ) : null}
        </div>
      )}
    </DashboardSection>
  );
}
