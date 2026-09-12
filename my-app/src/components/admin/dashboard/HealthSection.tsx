"use client";

import { useEffect } from "react";
import { HeartPulse } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import type { HealthCheck } from "@/src/services/admin/overview.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

export interface HealthResponse {
  status: string;
  checks: HealthCheck[];
}

const healthTone: Record<HealthCheck["status"], "success" | "warning" | "danger" | "neutral"> = {
  ok: "success",
  degraded: "warning",
  down: "danger",
  disabled: "neutral",
};

/** Section 8 — system health from GET /api/admin/dashboard/health. */
export function HealthSection({ onStatus }: { onStatus: (status: string | null) => void }) {
  const { data, loading, error, retry } = useDashboardFetch<HealthResponse>(
    "/api/admin/dashboard/health",
  );

  useEffect(() => {
    onStatus(data?.status ?? null);
  }, [data, onStatus]);

  return (
    <DashboardSection
      id="system-health"
      title="System health"
      description="Live dependency checks."
      icon={<HeartPulse size={15} aria-hidden="true" />}
      action={
        <Button type="button" size="sm" variant="outline" href="/admin/system">
          View system
        </Button>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {data.checks.map((h) => (
            <li key={h.name} className="flex items-center gap-3 py-2">
              <Badge size="sm" tone={healthTone[h.status]}>
                {h.status.toUpperCase()}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{h.name}</span>
              {h.detail ? (
                <span className="hidden max-w-md truncate text-xs text-zinc-500 sm:block">{h.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
