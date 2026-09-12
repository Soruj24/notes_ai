"use client";

import { useState } from "react";
import { ChartColumn } from "lucide-react";
import { EmptyState } from "@/src/components/ui/empty-state";
import { OptionMenu } from "@/src/components/ui/option-menu";
import type { ActivityOverview } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { BarChart } from "./BarChart";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

/** Section 3 — activity overview from GET /api/admin/dashboard/activity. */
export function ActivitySection() {
  const [days, setDays] = useState(30);
  const { data, loading, error, retry } = useDashboardFetch<ActivityOverview>(
    `/api/admin/dashboard/activity?days=${days}`,
  );

  const total =
    data ? data.totals.tasksCreated + data.totals.tasksCompleted + data.totals.notesCreated + data.totals.activityEvents : 0;

  return (
    <DashboardSection
      title="Activity overview"
      description="Content created, tasks completed, and workspace events per day."
      action={
        <OptionMenu
          label="Range"
          value={days}
          options={[
            { value: 7, label: "7d" },
            { value: 30, label: "30d" },
            { value: 90, label: "90d" },
          ]}
          onChange={setDays}
        />
      }
    >
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : total === 0 ? (
        <EmptyState
          icon={<ChartColumn size={20} aria-hidden="true" />}
          title="No activity yet"
          description={`No tasks, notes, or events recorded in the last ${data.days} days.`}
        />
      ) : (
        <div>
          <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
            <div className="flex gap-1.5">
              <dt>Tasks created:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.tasksCreated.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Tasks completed:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.tasksCompleted.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Notes created:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.notesCreated.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Workspace events:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.activityEvents.toLocaleString()}
              </dd>
            </div>
          </dl>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">Tasks completed per day</p>
              <BarChart buckets={data.tasksCompleted} label="Tasks completed per day" tone="bg-emerald-600 dark:bg-emerald-400" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">Notes created per day</p>
              <BarChart buckets={data.notesCreated} label="Notes created per day" tone="bg-sky-600 dark:bg-sky-400" />
            </div>
          </div>
        </div>
      )}
    </DashboardSection>
  );
}
