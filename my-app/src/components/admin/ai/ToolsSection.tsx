"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { AISection, SectionError, SectionSkeleton } from "./Section";
import { useAdminFetch } from "./useAdminFetch";
import { aiApi, type ToolInfo } from "./types";

/** Section 5 — Tools: per-tool enable toggles over the fixed registry. */
export function ToolsSection({ canConfigure, onChanged }: { canConfigure: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useAdminFetch<{ tools: ToolInfo[]; allowlist: string[] | null }>(
    "/api/admin/ai/tools",
  );
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const enabled = draft ?? new Set((data?.tools ?? []).filter((t) => t.enabled).map((t) => t.name));
  const dirty =
    data !== null &&
    (enabled.size !== data.tools.filter((t) => t.enabled).length ||
      [...enabled].some((n) => !data.tools.find((t) => t.name === n)?.enabled));

  function toggle(name: string, on: boolean) {
    setDraft((prev) => {
      const base = prev ?? new Set((data?.tools ?? []).filter((t) => t.enabled).map((t) => t.name));
      const next = new Set(base);
      if (on) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  async function save() {
    if (pending || !data) return;
    if (enabled.size === 0) {
      setSaveError("At least one tool must stay enabled.");
      return;
    }
    setPending(true);
    setSaveError(null);
    try {
      const names = data.tools.map((t) => t.name);
      await aiApi.setTools(names.filter((n) => enabled.has(n)));
      toast("Tool allowlist saved.", { tone: "success" });
      setDraft(null);
      retry();
      onChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AISection
      title="Tools"
      description="The registry is fixed code — this only toggles which tools the agent may call."
      action={
        canConfigure && data ? (
          <Button type="button" size="sm" variant="secondary" disabled={pending || !dirty} onClick={save}>
            {pending ? "Saving…" : "Save tools"}
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : (
        <div>
          <ul className="grid gap-2 md:grid-cols-2">
            {data.tools.map((tool) => (
              <li
                key={tool.name}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <Switch
                  id={`tool-${tool.name}`}
                  label={<span className="font-mono text-xs">{tool.name}</span>}
                  description={tool.description}
                  checked={enabled.has(tool.name)}
                  onChange={(e) => toggle(tool.name, e.target.checked)}
                  disabled={pending || !canConfigure}
                />
              </li>
            ))}
          </ul>
          {saveError ? (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {saveError}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">
            {data.allowlist === null ? "All tools enabled (default)." : `${enabled.size} of ${data.tools.length} enabled.`}
          </p>
        </div>
      )}
    </AISection>
  );
}
