"use client";

import { useState } from "react";
import { Activity, MessagesSquare, Power, Sparkles, TriangleAlert } from "lucide-react";
import { StatCard } from "@/src/components/admin/StatCard";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";
import { AISection, SectionError, ConfirmDialog } from "./Section";
import { useAdminFetch } from "./useAdminFetch";
import { aiApi, type AIOverview } from "./types";

/** Section 1 — AI Overview: live status, totals, kill switch (ai.disable). */
export function OverviewSection({ canDisable, onChanged }: { canDisable: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useAdminFetch<AIOverview>("/api/admin/ai/overview");
  const [confirming, setConfirming] = useState(false);

  async function flip() {
    if (!data) return;
    await aiApi.setConfig("ai.enabled", !data.enabled);
    toast(data.enabled ? "AI assistant disabled." : "AI assistant enabled.", { tone: "success" });
    retry();
    onChanged();
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading AI overview" role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <span className="sr-only">Loading AI overview…</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "No data returned."} onRetry={retry} />;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assistant"
          value={data.enabled ? "Enabled" : "Disabled"}
          hint={data.configured ? "Provider key present" : "No provider key"}
          icon={Power}
        />
        <StatCard
          label="Provider"
          value={data.providerReachable ? "Reachable" : "Down"}
          hint={data.activeModel}
          icon={Activity}
        />
        <StatCard
          label="AI messages"
          value={data.totals.messages.toLocaleString()}
          hint={`${data.totals.conversations.toLocaleString()} conversations`}
          icon={MessagesSquare}
        />
        <StatCard
          label="Failed runs"
          value={data.failedRuns.toLocaleString()}
          hint={`${data.rateLimited7d.toLocaleString()} rate-limited (7d)`}
          icon={TriangleAlert}
        />
      </div>
      <AISection
        title="AI Overview"
        description="Live assistant posture. The kill switch takes effect on the next request."
        action={
          <span className="flex items-center gap-2">
            <Badge size="sm" tone={data.enabled ? "success" : "danger"}>
              {data.enabled ? "ON" : "OFF"}
            </Badge>
            {canDisable ? (
              <Button type="button" size="sm" variant={data.enabled ? "destructive" : "primary"} onClick={() => setConfirming(true)}>
                <Sparkles size={14} aria-hidden="true" />
                {data.enabled ? "Disable AI" : "Enable AI"}
              </Button>
            ) : null}
          </span>
        }
      >
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
          <div className="flex gap-1.5">
            <dt>Model:</dt>
            <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{data.activeModel}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Embeddings:</dt>
            <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
              {data.embeddingProvider} · {data.embeddingModel}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Tokens (all time):</dt>
            <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {(data.totals.inputTokens + data.totals.outputTokens).toLocaleString()}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>AI feature flags:</dt>
            <dd className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{data.aiFlags}</dd>
          </div>
        </dl>
      </AISection>
      {confirming ? (
        <ConfirmDialog
          title={data.enabled ? "Disable the AI assistant?" : "Enable the AI assistant?"}
          body={
            data.enabled
              ? "New assistant turns return 503 immediately. In-flight streams finish. Audited as ai.config.set."
              : "The assistant resumes on the next request with the current effective configuration."
          }
          confirmLabel={data.enabled ? "Disable AI" : "Enable AI"}
          destructive={data.enabled}
          onClose={() => setConfirming(false)}
          onConfirm={flip}
        />
      ) : null}
    </div>
  );
}
