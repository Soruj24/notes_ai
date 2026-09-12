"use client";

import { UserPlus } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { RecentRegistration } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Section 5 — recent registrations from GET /api/admin/dashboard/registrations. */
export function RegistrationsSection() {
  const { data, loading, error, retry } = useDashboardFetch<{ users: RecentRegistration[] }>(
    "/api/admin/dashboard/registrations",
  );
  const users = data?.users ?? [];

  return (
    <DashboardSection
      title="Recent registrations"
      description="Newest accounts across the platform."
      action={
        <Button type="button" size="sm" variant="outline" href="/admin/users">
          View all users
        </Button>
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20} aria-hidden="true" />}
          title="No registrations yet"
          description="Accounts appear here after registration."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.name}</span>
                <span className="block truncate text-xs text-zinc-500">{u.email}</span>
              </span>
              <Badge size="sm" tone={u.status === "ACTIVE" ? "success" : "warning"}>
                {u.status}
              </Badge>
              <span className="hidden shrink-0 text-xs whitespace-nowrap text-zinc-500 sm:block">
                {formatDate(u.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
