"use client";

import { ScrollText } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { RecentAdminAction } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Section 6 — recent admin actions from GET /api/admin/dashboard/admin-actions. */
export function AdminActionsSection() {
  const { data, loading, error, retry } = useDashboardFetch<{ actions: RecentAdminAction[] }>(
    "/api/admin/dashboard/admin-actions",
  );
  const actions = data?.actions ?? [];

  return (
    <DashboardSection
      title="Recent admin actions"
      description="Latest entries from the append-only audit trail."
      action={
        <Button type="button" size="sm" variant="outline" href="/admin/audit">
          View audit log
        </Button>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={20} aria-hidden="true" />}
          title="No admin actions yet"
          description="Entries appear here as soon as privileged actions run through the console."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {actions.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {a.action}
                </span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {[a.resourceType, a.resourceId].filter(Boolean).join(" · ") || "platform"}
                </span>
              </span>
              <span className="shrink-0 text-[11px] whitespace-nowrap text-zinc-500">
                {formatDateTime(a.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
