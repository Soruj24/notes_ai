"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Poll the route (server re-checks maintenance state) until service resumes. */
export function MaintenanceRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
