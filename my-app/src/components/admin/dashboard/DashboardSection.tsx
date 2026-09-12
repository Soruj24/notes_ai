"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";

/** Card shell shared by every dashboard section. Server-safe. */
export function DashboardSection({
  id,
  title,
  description,
  icon,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="min-w-0 rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-3 sm:px-5 dark:border-zinc-900">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

/** Skeleton blocks for section loading states. */
export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" role="status" className="grid gap-2">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}

/** Retryable error state for a failed section fetch. */
export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<RefreshCw size={20} aria-hidden="true" />}
      title="Couldn't load this section"
      description={message}
      action={
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Retry
        </Button>
      }
    />
  );
}
