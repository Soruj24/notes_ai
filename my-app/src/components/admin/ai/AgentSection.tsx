"use client";

import { AISection, SectionSkeleton } from "./Section";
import { ConfigField, type WriteAccess } from "./ConfigField";
import type { ConfigEntry } from "./types";

const AGENT_KEYS = ["ai.temperature", "ai.maxTokens", "ai.maxRetries", "ai.recursionLimit", "ai.timeoutMs"];

/** Section 4 — Agent: sampling, budgets, retries, recursion, timeout. */
export function AgentSection({
  access,
  entries,
  entriesLoading,
  onChanged,
}: {
  access: WriteAccess;
  entries: ConfigEntry[];
  entriesLoading: boolean;
  onChanged: () => void;
}) {
  const fields = entries.filter((e) => AGENT_KEYS.includes(e.key));

  return (
    <AISection
      title="Agent"
      description="Sampling and per-turn budgets. Applied fresh on every turn — no restarts."
    >
      {entriesLoading ? (
        <SectionSkeleton rows={3} />
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
