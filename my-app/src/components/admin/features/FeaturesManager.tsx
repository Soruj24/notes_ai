"use client";

import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, ToggleLeft } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { FeatureEditDialog } from "./FeatureEditDialog";
import { fetchFeatures, updateFeature, type FeatureRow } from "./types";

function targetingChips(f: FeatureRow): string[] {
  const parts: string[] = [];
  if (f.environment !== "all") parts.push(`env:${f.environment}`);
  if (f.rolloutPercentage < 100) parts.push(`${f.rolloutPercentage}%`);
  if (f.targetRoles.length) parts.push(`roles:${f.targetRoles.length}`);
  if (f.targetUsers.length) parts.push(`users:${f.targetUsers.length}`);
  return parts;
}

/**
 * Flag console grouped by catalog group. Toggles apply immediately
 * backend-wide (services re-evaluate per call); every change audits.
 */
export function FeaturesManager({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<FeatureRow | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    fetchFeatures()
      .then((rows) => {
        if (!cancelled) {
          setFeatures(rows);
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
  }, [attempt]);

  async function quickToggle(f: FeatureRow) {
    if (toggling) return;
    setToggling(f.key);
    try {
      const updated = await updateFeature(f.key, { enabled: !f.enabled });
      setFeatures((prev) => (prev ? prev.map((row) => (row.key === f.key ? updated : row)) : prev));
      toast(`${f.name} ${updated.enabled ? "enabled" : "disabled"}.`, { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setToggling(null);
    }
  }

  if (loading && features === null) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading features" className="grid gap-3">
        <span className="sr-only">Loading features…</span>
        <div aria-hidden="true" className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-16 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        ))}
      </div>
    );
  }

  if ((error && features === null) || features === null) {
    return (
      <EmptyState
        icon={<ToggleLeft size={20} aria-hidden="true" />}
        title="Couldn't load features"
        description={error ?? "No data returned."}
        action={
          <Button type="button" size="sm" variant="secondary" onClick={load}>
            Retry
          </Button>
        }
      />
    );
  }

  const groups = [...new Set(features.map((f) => f.group))];
  const enabled = features.filter((f) => f.enabled).length;
  const partial = features.filter(
    (f) => f.rolloutPercentage < 100 || f.environment !== "all" || f.targetRoles.length > 0 || f.targetUsers.length > 0,
  ).length;

  return (
    <div className="grid content-start gap-4 sm:gap-5">
      <section
        aria-label="Flag overview"
        className="flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
          >
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
              {enabled} of {features.length} flags enabled
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {partial} with targeting rules · {groups.length} {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
        </div>
        <p className="text-xs leading-5 text-zinc-400 sm:ml-auto sm:max-w-xs sm:text-right dark:text-zinc-500">
          Toggles enforce backend-wide from the next call. Every change is audited.
        </p>
      </section>
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error} <Button type="button" size="sm" variant="ghost" onClick={load}>Retry</Button>
        </p>
      ) : null}
      {groups.map((group) => {
        const rows = features.filter((f) => f.group === group);
        const on = rows.filter((f) => f.enabled).length;
        return (
          <section
            key={group}
            aria-label={`${group} features`}
            className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 sm:px-5 dark:border-zinc-900 dark:bg-zinc-900/40">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{group}</h2>
              <span
                aria-label={`${on} of ${rows.length} on`}
                className="rounded-full bg-zinc-900/[0.06] px-1.5 py-px text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
              >
                {on}/{rows.length} on
              </span>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {rows.map((f) => {
                const chips = targetingChips(f);
                const busy = toggling === f.key;
                return (
                  <li key={f.key} className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {f.name}
                      </span>
                      {f.description ? (
                        <span className="mt-0.5 block truncate text-[13px] text-zinc-500 dark:text-zinc-400">
                          {f.description}
                        </span>
                      ) : null}
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {chips.length ? (
                          chips.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-zinc-100 px-1.5 py-px font-mono text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Everyone</span>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge size="sm" tone={f.enabled ? "success" : "neutral"}>
                        {f.enabled ? "ON" : "OFF"}
                      </Badge>
                      {canEdit ? (
                        <Switch
                          id={`flag-${f.key}`}
                          label={<span className="sr-only">{f.enabled ? `Disable ${f.name}` : `Enable ${f.name}`}</span>}
                          checked={f.enabled}
                          disabled={busy}
                          onChange={() => void quickToggle(f)}
                        />
                      ) : null}
                      {canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(f)}
                          className="h-8"
                        >
                          Edit
                        </Button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {editing ? (
        <FeatureEditDialog
          feature={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) =>
            setFeatures((prev) => (prev ? prev.map((row) => (row.key === updated.key ? updated : row)) : prev))
          }
        />
      ) : null}
    </div>
  );
}
