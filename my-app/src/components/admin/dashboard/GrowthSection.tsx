"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/src/components/ui/empty-state";
import { OptionMenu } from "@/src/components/ui/option-menu";
import type { UserGrowth } from "@/src/services/admin/dashboard.service";
import { useDashboardFetch } from "./useDashboardFetch";
import { BarChart } from "./BarChart";
import { DashboardSection, SectionError, SectionSkeleton } from "./DashboardSection";

/** Section 2 — user growth from GET /api/admin/dashboard/growth. */
export function GrowthSection() {
  const [days, setDays] = useState(30);
  const { data, loading, error, retry } = useDashboardFetch<UserGrowth>(
    `/api/admin/dashboard/growth?days=${days}`,
  );

  const newInWindow = data ? data.perDay.reduce((n, b) => n + b.value, 0) : 0;
  const latestTotal = data && data.cumulative.length ? data.cumulative[data.cumulative.length - 1].value : 0;
  const isEmpty = !loading && !error && data && newInWindow === 0;

  return (
    <DashboardSection
      title="User growth"
      description="New registrations per day and running account total."
      icon={<TrendingUp size={15} aria-hidden="true" />}
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
      ) : isEmpty ? (
        <EmptyState
          icon={<TrendingUp size={20} aria-hidden="true" />}
          title="No new registrations"
          description={`Nobody signed up in the last ${data.days} days.`}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">
              New users · {newInWindow.toLocaleString()} in {data.days}d
            </p>
            <BarChart buckets={data.perDay} label="New users per day" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">
              Total accounts · {latestTotal.toLocaleString()}
            </p>
            <BarChart
              buckets={data.cumulative}
              label="Cumulative accounts per day"
              tone="bg-emerald-600 dark:bg-emerald-400"
            />
          </div>
        </div>
      )}
    </DashboardSection>
  );
}
