"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";
import { AISection, SectionSkeleton } from "./Section";
import { aiApi, type ConfigEntry } from "./types";

const MAX_PROMPT = 8000;

/** Section 6 — Prompts: system prompt override (plain text, never executed). */
export function PromptsSection({
  canConfigure,
  entries,
  entriesLoading,
  onChanged,
}: {
  canConfigure: boolean;
  entries: ConfigEntry[];
  entriesLoading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const entry = entries.find((e) => e.key === "ai.prompts.system");
  const current = typeof entry?.value === "string" ? entry.value : "";
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = draft ?? current;
  const dirty = text !== current;

  async function save() {
    if (pending) return;
    if (text.length > MAX_PROMPT) {
      setError(`Must be ${MAX_PROMPT} characters or fewer.`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await aiApi.setConfig("ai.prompts.system", text);
      toast("System prompt saved.", { tone: "success" });
      setDraft(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function revert() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await aiApi.resetConfig("ai.prompts.system");
      toast("Reverted to the built-in prompt.", { tone: "success" });
      setDraft(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AISection
      title="Prompts"
      description="Override text is data: length-capped, audited, and never evaluated as code. Empty = built-in default."
      action={
        <span className="text-xs text-zinc-500 tabular-nums" aria-live="polite">
          {text.length.toLocaleString()} / {MAX_PROMPT.toLocaleString()}
        </span>
      }
    >
      {entriesLoading ? (
        <SectionSkeleton rows={3} />
      ) : (
        <div className="grid gap-2">
          <label htmlFor="ai-system-prompt" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            System prompt override
          </label>
          <textarea
            id="ai-system-prompt"
            value={text}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            maxLength={MAX_PROMPT + 100}
            disabled={pending || !canConfigure}
            placeholder="Built-in default prompt is active. Enter an override…"
            className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 font-mono text-xs leading-5 placeholder:text-zinc-500 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-500 dark:border-zinc-800"
          />
          {canConfigure ? (
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="secondary" onClick={save} disabled={pending || !dirty}>
                {pending ? "Saving…" : "Save prompt"}
              </Button>
              {entry?.source === "console" ? (
                <Button type="button" size="sm" variant="ghost" onClick={revert} disabled={pending}>
                  Revert to default
                </Button>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </AISection>
  );
}
