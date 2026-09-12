"use client";

import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { usePermissions } from "@/src/components/auth/Can";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { SETTING_CATEGORIES } from "@/src/lib/settings/catalog";
import { ConfigField, canWriteEntry } from "@/src/components/admin/ai/ConfigField";
import { useAdminFetch } from "@/src/components/admin/ai/useAdminFetch";
import { AISection, SectionError, SectionSkeleton } from "@/src/components/admin/ai/Section";
import type { ConfigEntry } from "@/src/components/admin/ai/types";
import { HistoryPanel } from "./HistoryPanel";
import { settingsApi, type SettingEntry } from "./types";

const AI_KEYS = ["ai.enabled", "ai.limits.requestsPerUserPerDay", "ai.limits.tokensPerUserPerDay"];

/**
 * Settings workspace: 12 category tabs plus change history. Every field
 * validates server-side and audits; editors render only with the
 * setting's permission (display-only gating, service enforces).
 */
export function SettingsManager({ role }: { role: PlatformRole | null }) {
  const { can } = usePermissions(role);
  const canEdit = can("settings.update");
  const access = {
    canConfigure: can("ai.configure"),
    canDisable: can("ai.disable"),
    isSuperadmin: role === "SUPER_ADMIN",
  };

  const [category, setCategory] = useState<string>("General");
  const settings = useAdminFetch<{ entries: SettingEntry[] }>("/api/admin/settings");
  const aiConfig = useAdminFetch<{ entries: ConfigEntry[] }>("/api/admin/ai/config");

  const entries = settings.data?.entries ?? [];
  const inCategory = entries.filter((e) => e.category === category);
  const aiEntries = (aiConfig.data?.entries ?? []).filter((e) => AI_KEYS.includes(e.key));

  return (
    <div className="grid content-start gap-4">
      <nav aria-label="Settings categories" className="flex flex-wrap gap-1.5">
        {[...SETTING_CATEGORIES, "History" as const].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
              category === c
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      {category === "History" ? (
        <AISection title="Change history" description="Every settings write and reset, newest first.">
          <HistoryPanel />
        </AISection>
      ) : category === "AI" ? (
        <AISection
          title="AI"
          description="Operational AI controls. Full model, provider, tool, and prompt management lives in the AI Control Center."
          action={
            <Button type="button" size="sm" variant="outline" href="/admin/ai">
              Open AI Control Center
            </Button>
          }
        >
          {aiConfig.loading && aiEntries.length === 0 ? (
            <SectionSkeleton rows={3} />
          ) : aiConfig.error && aiEntries.length === 0 ? (
            <SectionError message={aiConfig.error} onRetry={aiConfig.retry} />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {aiEntries.map((entry) => (
                <ConfigField
                  key={`${entry.key}:${entry.source}:${JSON.stringify(entry.value)}`}
                  entry={entry}
                  canWrite={canWriteEntry(entry, access)}
                  onChanged={aiConfig.retry}
                />
              ))}
            </div>
          )}
        </AISection>
      ) : settings.loading && entries.length === 0 ? (
        <SectionSkeleton rows={4} />
      ) : settings.error && entries.length === 0 ? (
        <SectionError message={settings.error} onRetry={settings.retry} />
      ) : inCategory.length === 0 ? (
        <EmptyState
          icon={<SettingsIcon size={20} aria-hidden="true" />}
          title={`No settings in ${category}`}
          description="Settings appear here as the registry grows."
        />
      ) : (
        <AISection title={category} description={`${inCategory.length} setting${inCategory.length === 1 ? "" : "s"}. Changes apply immediately and audit.`}>
          <div className="grid gap-2 md:grid-cols-2">
            {inCategory.map((entry) => (
              <ConfigField
                key={`${entry.key}:${entry.source}:${JSON.stringify(entry.value)}`}
                entry={{
                  key: entry.key,
                  label: entry.label,
                  description: entry.description,
                  type: entry.type,
                  options: entry.options,
                  value: entry.value,
                  source: entry.source,
                  writePermission: entry.permission,
                }}
                canWrite={canEdit}
                onChanged={settings.retry}
                saveFn={(key, value) => settingsApi.save(key, value)}
                resetFn={(key) => settingsApi.reset(key)}
              />
            ))}
          </div>
        </AISection>
      )}
    </div>
  );
}
