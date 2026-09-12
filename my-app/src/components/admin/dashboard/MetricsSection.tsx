"use client";

import {
  Activity,
  Briefcase,
  CircleCheck,
  ListTodo,
  NotebookPen,
  Sparkles,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "@/src/components/admin/StatCard";
import type { DashboardMetrics } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { SectionError } from "./DashboardSection";

interface MetricDef {
  key: string;
  label: string;
  getValue: (m: DashboardMetrics) => string;
  hint: (m: DashboardMetrics) => string;
  icon: LucideIcon;
}

const METRICS: MetricDef[] = [
  {
    key: "totalUsers",
    label: "Total Users",
    getValue: (m) => m.totalUsers.toLocaleString(),
    hint: () => "Registered accounts",
    icon: Users,
  },
  {
    key: "activeUsers",
    label: "Active Users",
    getValue: (m) => m.activeUsers.toLocaleString(),
    hint: () => "Status ACTIVE",
    icon: UserCheck,
  },
  {
    key: "newUsers",
    label: "New Users",
    getValue: (m) => m.newUsers.toLocaleString(),
    hint: (m) => `Last ${m.newUsersWindowDays} days`,
    icon: UserPlus,
  },
  {
    key: "suspendedUsers",
    label: "Suspended Users",
    getValue: (m) => m.suspendedUsers.toLocaleString(),
    hint: () => "Status SUSPENDED",
    icon: UserX,
  },
  {
    key: "totalWorkspaces",
    label: "Total Workspaces",
    getValue: (m) => m.totalWorkspaces.toLocaleString(),
    hint: () => "Across all users",
    icon: Briefcase,
  },
  {
    key: "totalNotes",
    label: "Total Notes",
    getValue: (m) => m.totalNotes.toLocaleString(),
    hint: () => "Stored notes",
    icon: NotebookPen,
  },
  {
    key: "totalTasks",
    label: "Total Tasks",
    getValue: (m) => m.totalTasks.toLocaleString(),
    hint: () => "All statuses",
    icon: ListTodo,
  },
  {
    key: "completedTasks",
    label: "Completed Tasks",
    getValue: (m) => m.completedTasks.toLocaleString(),
    hint: (m) =>
      m.totalTasks > 0 ? `${Math.round((m.completedTasks / m.totalTasks) * 100)}% of total` : "No tasks yet",
    icon: CircleCheck,
  },
  {
    key: "aiRequests",
    label: "AI Requests",
    getValue: (m) => m.aiRequests.toLocaleString(),
    hint: () => "Stored AI messages",
    icon: Sparkles,
  },
  {
    key: "aiErrors",
    label: "AI Errors",
    getValue: (m) => m.aiErrors.toLocaleString(),
    hint: (m) => m.aiErrorsSource,
    icon: TriangleAlert,
  },
];

/** Section 1 — overview metrics from GET /api/admin/dashboard/metrics. */
export function MetricsSection({ healthStatus }: { healthStatus: string | null }) {
  const { data, loading, error, retry } = useDashboardFetch<DashboardMetrics>(
    "/api/admin/dashboard/metrics",
  );

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading metrics" role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <span className="sr-only">Loading metrics…</span>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "No data returned."} onRetry={retry} />;
  }

  return (
    <section aria-label="Platform metrics" className="grid gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Platform metrics
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Live database totals</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <StatCard
            key={metric.key}
            label={metric.label}
            value={metric.getValue(data)}
            hint={metric.hint(data)}
            icon={metric.icon}
          />
        ))}
        <StatCard
          label="System Health"
          value={healthStatus ?? "…"}
          hint={healthStatus ? "Live dependency checks" : "Loading health…"}
          icon={Activity}
        />
      </div>
    </section>
  );
}
