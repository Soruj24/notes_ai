"use client";

import { BlockedTasks } from "@/src/components/dashboard/BlockedTasks";
import { ReadyToStart } from "@/src/components/dashboard/ReadyToStart";
import { CriticalPathCard } from "@/src/components/dashboard/CriticalPathCard";
import { DependencyAlerts } from "@/src/components/dashboard/DependencyAlerts";
import { GoalsProgress } from "@/src/components/dashboard/GoalsProgress";
import { GreetingHeader } from "@/src/components/dashboard/GreetingHeader";
import { InsightsPanel } from "@/src/components/dashboard/InsightsPanel";
import { MetricsRow } from "@/src/components/dashboard/MetricsRow";
import { QuickCapture } from "@/src/components/dashboard/QuickCapture";
import { RecentNotes } from "@/src/components/dashboard/RecentNotes";
import { TodayTasks } from "@/src/components/dashboard/TodayTasks";
import { TodayTimeline } from "@/src/components/dashboard/TodayTimeline";
import { UpcomingEvents } from "@/src/components/dashboard/UpcomingEvents";

interface DashboardPageProps {
  wid: string;
  userName: string;
}

/**
 * Today briefing composition.
 * Priority order: hero → metrics → capture/focus → timeline → sidebar signals.
 * Single QuickCapture instance at the top of the main column so it leads
 * on mobile and sits first on desktop without duplicate IDs or state.
 */
export function DashboardPage({ wid, userName }: DashboardPageProps) {
  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <GreetingHeader userName={userName} />
      <MetricsRow wid={wid} />
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="grid min-w-0 gap-4 sm:gap-5 lg:col-span-7 xl:col-span-8">
          <QuickCapture wid={wid} />
          <TodayTasks wid={wid} />
          <BlockedTasks wid={wid} />
          <ReadyToStart wid={wid} />
          <CriticalPathCard wid={wid} />
          <DependencyAlerts wid={wid} />
          <TodayTimeline wid={wid} />
          <RecentNotes wid={wid} />
        </div>
        <div className="grid min-w-0 gap-4 sm:gap-5 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[4.5rem]">
          <InsightsPanel wid={wid} />
          <GoalsProgress wid={wid} />
          <UpcomingEvents wid={wid} />
        </div>
      </div>
    </div>
  );
}
