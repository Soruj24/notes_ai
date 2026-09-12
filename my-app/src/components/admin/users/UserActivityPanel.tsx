"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { fetchActivity, type UserActivityResponse } from "./types";

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Workspace trail (as actor) plus admin-audit entries about the user. */
export function UserActivityPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<UserActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchActivity(userId)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading activity" className="grid gap-2">
        <span className="sr-only">Loading activity…</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<Activity size={20} aria-hidden="true" />}
        title="Couldn't load activity"
        description={error ?? "No data returned."}
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setError(null);
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }

  if (data.activity.length === 0 && data.audit.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={20} aria-hidden="true" />}
        title="No activity yet"
        description="Workspace actions and admin-audit entries for this account appear here."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {data.activity.length ? (
        <div>
          <h4 className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Workspace activity
          </h4>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {data.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.action}</span>{" "}
                  <span className="text-zinc-500">{a.entityType}</span>
                </span>
                <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.audit.length ? (
        <div>
          <h4 className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Admin audit trail
          </h4>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {data.audit.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{a.action}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
