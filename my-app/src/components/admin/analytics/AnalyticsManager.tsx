"use client";

import { useEffect, useState } from "react";
import { Activity, ChartColumn, MessagesSquare, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { StatCard } from "@/src/components/admin/StatCard";
import { BarChart } from "@/src/components/admin/dashboard/BarChart";
import { AISection, SectionError, SectionSkeleton } from "@/src/components/admin/ai/Section";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { fetchAnalytics, type AdminAnalytics, type RangeKey } from "./types";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
];

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Platform analytics: growth, engagement, content, AI, errors, features. */
export function AnalyticsManager() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    fetchAnalytics(range, since, until)
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
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
  }, [range, since, until, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  const maxFeatures = Math.max(1, ...(data?.features.map((f) => f.uses) ?? [1]));
  const windowLabel = data
    ? `${new Date(data.range.since).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(data.range.until).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${data.range.days}d`
    : null;

  return (
    <div className="grid content-start gap-4 sm:gap-5">
      <section
        aria-label="Analytics controls"
        className="grid gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span
            className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-100 p-1 max-sm:w-full sm:w-auto dark:bg-zinc-900"
            role="group"
            aria-label="Date range"
          >
            {RANGES.map((r) => {
              const selected = range === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRange(r.key)}
                  className={
                    selected
                      ? "rounded-lg bg-white px-2.5 py-1.5 text-[13px] font-semibold text-zinc-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:px-3.5 dark:bg-zinc-950 dark:text-zinc-50"
                      : "rounded-lg px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-zinc-500 transition-all hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:px-3.5 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </span>
          {windowLabel ? (
            <p className="text-xs text-zinc-500 tabular-nums sm:ml-auto dark:text-zinc-400" aria-live="polite">
              {windowLabel}
            </p>
          ) : null}
        </div>
        {range === "custom" ? (
          <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 sm:max-w-md dark:border-zinc-900">
            <Input
              id="analytics-since"
              label="From"
              type="date"
              value={since}
              max={until || todayInput()}
              onChange={(e) => setSince(e.target.value)}
              size="sm"
            />
            <Input
              id="analytics-until"
              label="To"
              type="date"
              value={until}
              min={since || undefined}
              max={todayInput()}
              onChange={(e) => setUntil(e.target.value)}
              size="sm"
            />
          </div>
        ) : null}
      </section>

      {loading && !data ? (
        <SectionSkeleton rows={6} />
      ) : error && !data ? (
        <SectionError message={error} onRetry={retry} />
      ) : !data ? (
        <EmptyState
          icon={<ChartColumn size={20} aria-hidden="true" />}
          title="No analytics yet"
          description="Numbers appear here once accounts and content exist."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="DAU" value={data.activity.dauLatest.toLocaleString()} hint="Active today" icon={Activity} />
            <StatCard label="WAU" value={data.activity.wau.toLocaleString()} hint="Trailing 7 days" icon={Users} />
            <StatCard label="MAU" value={data.activity.mau.toLocaleString()} hint="Trailing 30 days" icon={Users} />
            <StatCard label="New users" value={data.users.newTotal.toLocaleString()} hint={`Of ${data.users.total.toLocaleString()} total`} icon={TrendingUp} />
            <StatCard label="AI requests" value={data.ai.totals.messages.toLocaleString()} hint={`${data.ai.totals.tokens.toLocaleString()} tokens`} icon={MessagesSquare} />
            <StatCard label="AI errors" value={data.ai.totals.errors.toLocaleString()} hint="Rate limits + failed runs" icon={TriangleAlert} />
          </div>

          <AISection title="User growth" description="New registrations per day and running total.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">New users per day</p>
                <BarChart buckets={data.users.newPerDay} label="New users per day" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">Total accounts</p>
                <BarChart buckets={data.users.cumulative} label="Cumulative accounts" tone="bg-emerald-600 dark:bg-emerald-400" />
              </div>
            </div>
          </AISection>

          <AISection title="Engagement" description="Daily active users (workspace activity, logins, AI use).">
            <p className="mb-1 text-xs font-medium text-zinc-500">DAU per day</p>
            <BarChart buckets={data.activity.dau} label="Daily active users" tone="bg-sky-600 dark:bg-sky-400" />
          </AISection>

          <AISection title="Content" description="Created per day across domains.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">
                  Notes created · {data.content.totals.notes.toLocaleString()}
                </p>
                <BarChart buckets={data.content.notesCreated} label="Notes created per day" tone="bg-sky-600 dark:bg-sky-400" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">
                  Tasks created · {data.content.totals.tasks.toLocaleString()}
                </p>
                <BarChart buckets={data.content.tasksCreated} label="Tasks created per day" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">
                  Tasks completed · {data.content.totals.completed.toLocaleString()}
                </p>
                <BarChart buckets={data.content.tasksCompleted} label="Tasks completed per day" tone="bg-emerald-600 dark:bg-emerald-400" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">
                  Calendar events · {data.content.totals.events.toLocaleString()}
                </p>
                <BarChart buckets={data.content.eventsCreated} label="Events created per day" tone="bg-amber-600 dark:bg-amber-400" />
              </div>
            </div>
          </AISection>

          <AISection title="AI usage" description="Requests, tokens, and errors per day.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">AI requests</p>
                <BarChart buckets={data.ai.messagesPerDay} label="AI requests per day" tone="bg-violet-600 dark:bg-violet-400" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">AI tokens</p>
                <BarChart buckets={data.ai.tokensPerDay} label="AI tokens per day" tone="bg-violet-600 dark:bg-violet-400" />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">AI errors</p>
                <BarChart buckets={data.ai.errorsPerDay} label="AI errors per day" tone="bg-red-600 dark:bg-red-400" />
              </div>
            </div>
          </AISection>

          <AISection title="Feature usage" description="Workspace actions by entity plus assistant turns.">
            {data.features.length === 0 || data.features.every((f) => f.uses === 0) ? (
              <p className="text-xs text-zinc-500">No recorded usage in this range.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2" aria-label="Feature usage">
                {data.features.map((f) => (
                  <li key={f.key} className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-900">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-800 dark:text-zinc-200" title={f.key}>
                        {f.key}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {f.uses.toLocaleString()}
                      </span>
                    </div>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900" aria-hidden="true">
                      <span
                        className="block h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                        style={{ width: `${Math.max(f.uses > 0 ? 2 : 0, Math.round((f.uses / maxFeatures) * 100))}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AISection>
        </>
      )}
    </div>
  );
}
