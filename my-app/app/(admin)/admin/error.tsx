"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";

/** Route error boundary for /admin — recoverable with retry. */
export default function AdminDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={<TriangleAlert size={20} aria-hidden="true" />}
      title="Dashboard failed to load"
      description="Something went wrong while loading the admin dashboard."
      action={
        <Button type="button" size="sm" variant="secondary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
