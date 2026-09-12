"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/src/components/ui/empty-state";
import { OptionMenu } from "@/src/components/ui/option-menu";
import { BarChart } from "@/src/components/admin/dashboard/BarChart";
import { AISection, SectionError, SectionSkeleton } from "./Section";
import { useAdminFetch } from "./useAdminFetch";
import type { AiUsage } from "./types";

/** Section 7 — Usage: messages/tokens per day, totals, by-model split. */
export function UsageSection() {
  const [days, setDays] = useState(30);
  const { data, loading, error, retry } = useAdminFetch<AiUsage>(`/api/admin/ai/usage?days=${days}`);

  return (
    <AISection
      title="Usage"
      description="Stored messages and token totals. No message content is shown."
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
      ) : data.totals.messages === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} aria-hidden="true" />}
          title="No AI usage yet"
          description="Messages and token totals appear here once the assistant is used."
        />
      ) : (
        <div>
          <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
            <div className="flex gap-1.5">
              <dt>Conversations:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.conversations.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Messages:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.messages.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Input tokens:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.inputTokens.toLocaleString()}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Output tokens:</dt>
              <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                {data.totals.outputTokens.toLocaleString()}
              </dd>
            </div>
          </dl>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">Messages per day</p>
              <BarChart buckets={data.messagesPerDay} label="AI messages per day" tone="bg-violet-600 dark:bg-violet-400" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">Tokens per day</p>
              <BarChart buckets={data.tokensPerDay} label="AI tokens per day" tone="bg-violet-600 dark:bg-violet-400" />
            </div>
          </div>
          {data.byModel.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Conversations by model">
              {data.byModel.map((row) => (
                <li
                  key={row.model}
                  className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                >
                  {row.model} · {row.conversations.toLocaleString()}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </AISection>
  );
}
