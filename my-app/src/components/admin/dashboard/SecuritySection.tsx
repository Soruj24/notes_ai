"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { SecurityOverview } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

const alertTone: Record<string, "danger" | "warning" | "neutral"> = {
  "login.failed": "danger",
  "permission.denied": "warning",
  "rate.limited": "warning",
  "suspicious.activity": "danger",
  "session.rejected": "warning",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Section 7 — security alerts from GET /api/admin/dashboard/security. */
export function SecuritySection() {
  const { data, loading, error, retry } = useDashboardFetch<SecurityOverview>(
    "/api/admin/dashboard/security",
  );
  const alerts = data?.alerts ?? [];

  return (
    <DashboardSection
      title="Security alerts"
      description="Latest security events. Failed logins and denials cover the last 7 days."
      icon={<ShieldCheck size={15} aria-hidden="true" />}
      action={
        <Button type="button" size="sm" variant="outline" href="/admin/security">
          View security
        </Button>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={20} aria-hidden="true" />}
          title="No security events"
          description="Logins, denials, and revocations appear here once recorded."
        />
      ) : (
        <div>
          <dl className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
            <div className="flex gap-1.5">
              <dt>Failed logins (7d):</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.failedLoginsLast7d.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Permission denials (7d):</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.deniedLast7d.toLocaleString()}
              </dd>
            </div>
          </dl>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <Badge size="sm" tone={alertTone[a.type] ?? "neutral"}>
                  {a.type}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                  {[a.email, a.ipAddress].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="shrink-0 text-[11px] whitespace-nowrap text-zinc-500">
                  {formatDateTime(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardSection>
  );
}
