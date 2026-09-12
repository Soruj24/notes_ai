"use client";

import { AISection, SectionSkeleton } from "./Section";
import { ConfigField, canWriteEntry, type WriteAccess } from "./ConfigField";
import type { ConfigEntry } from "./types";

/**
 * Section 10 — Configuration: full effective config (secret-free),
 * per-key source badges, and resets. Every save/delete audits.
 */
export function ConfigurationSection({
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
  return (
    <AISection
      title="Configuration"
      description="Every effective value with its source. Console overrides win over environment; Reset restores the default."
    >
      {entriesLoading ? (
        <SectionSkeleton rows={5} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {entries.map((entry) => (
            <ConfigField
              key={entry.key}
              entry={entry}
              canWrite={canWriteEntry(entry, access)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </AISection>
  );
}
