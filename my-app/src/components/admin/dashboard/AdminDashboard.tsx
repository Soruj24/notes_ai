"use client";

import { useState } from "react";
import { MetricsSection } from "./MetricsSection";
import { GrowthSection } from "./GrowthSection";
import { ActivitySection } from "./ActivitySection";
import { AiUsageSection } from "./AiUsageSection";
import { RegistrationsSection } from "./RegistrationsSection";
import { AdminActionsSection } from "./AdminActionsSection";
import { SecuritySection } from "./SecuritySection";
import { HealthSection } from "./HealthSection";
import { FeaturesSection } from "./FeaturesSection";

/**
 * Console home. Every section fetches its own server-side API
 * (/api/admin/dashboard/*) so each has independent loading, empty,
 * and error states. No mock data anywhere — empty collections render
 * empty states.
 *
 * Order is operational priority: platform totals, then live posture
 * (health + security), then growth and activity, then AI, then
 * administration (registrations, actions, flags).
 */
export function AdminDashboard() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  return (
    <div className="grid content-start gap-4 sm:gap-5">
      <MetricsSection healthStatus={healthStatus} />
      <div className="grid content-start gap-4 sm:gap-5 xl:grid-cols-2">
        <HealthSection onStatus={setHealthStatus} />
        <SecuritySection />
      </div>
      <div className="grid content-start gap-4 sm:gap-5 xl:grid-cols-2">
        <GrowthSection />
        <ActivitySection />
      </div>
      <AiUsageSection />
      <div className="grid content-start gap-4 sm:gap-5 xl:grid-cols-2">
        <RegistrationsSection />
        <AdminActionsSection />
      </div>
      <FeaturesSection />
    </div>
  );
}
