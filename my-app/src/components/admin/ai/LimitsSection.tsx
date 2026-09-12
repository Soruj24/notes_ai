"use client";

import { Badge } from "@/src/components/ui/badge";
import { AISection, SectionSkeleton } from "./Section";
import { ConfigField, type WriteAccess } from "./ConfigField";
import type { ConfigEntry } from "./types";

const LIMIT_KEYS = ["ai.limits.requestsPerUserPerDay", "ai.limits.tokensPerUserPerDay"];

/** Section 8 — Limits: kill-switch state + per-user daily budgets (0 = unlimited). */
export function LimitsSection({
  access,
  entries,
  entriesLoading,
  enabled,
  onChanged,
}: {
  access: WriteAccess;
  entries: ConfigEntry[];
  entriesLoading: boolean;
  enabled: boolean | null;
  onChanged: () => void;
}) {
  const fields = entries.filter((e) => LIMIT_KEYS.includes(e.key));

  return (
    <AISection
      title="Limits"
      description="Budgets enforce per user per UTC day in the command route. 0 disables a budget."
      action={
        enabled !== null ? (
          <Badge size="sm" tone={enabled ? "success" : "danger"}>
            Assistant {enabled ? "ON" : "OFF"}
          </Badge>
        ) : undefined
      }
    >
      {entriesLoading ? (
        <SectionSkeleton rows={2} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {fields.map((entry) => (
            <ConfigField
              key={entry.key}
              entry={entry}
              canWrite={access.canConfigure}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </AISection>
  );
}
