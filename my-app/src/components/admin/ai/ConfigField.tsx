"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { aiApi, type ConfigEntry } from "./types";

const sourceTone: Record<ConfigEntry["source"], "accent" | "neutral" | "success"> = {
  console: "accent",
  environment: "neutral",
  default: "success",
};

export interface WriteAccess {
  canConfigure: boolean;
  canDisable: boolean;
  isSuperadmin: boolean;
}

/** Per-entry write gate: kill switch needs ai.disable, secrets need superadmin. */
export function canWriteEntry(entry: ConfigEntry, access: WriteAccess): boolean {
  if (entry.key === "ai.enabled") return access.canDisable;
  if (entry.superadminOnly) return access.isSuperadmin && access.canConfigure;
  return access.canConfigure;
}

/**
 * Typed editor for one registry setting. Secret keys render a write-only
 * password field with a configured badge — values are never displayed.
 * Saves validate server-side and audit; Reset deletes the console
 * override (falls back to environment/default).
 */
export function ConfigField({
  entry,
  canWrite,
  onChanged,
  saveFn,
  resetFn,
}: {
  entry: ConfigEntry;
  canWrite: boolean;
  onChanged: () => void;
  /** Override persistence (defaults to the AI config API). */
  saveFn?: (key: string, value: unknown) => Promise<unknown>;
  resetFn?: (key: string) => Promise<unknown>;
}) {
  const { toast } = useToast();
  const isSecret = entry.key === "ai.provider.apiKey";
  const isBool = entry.type === "boolean" && !isSecret;
  const [draft, setDraft] = useState<string>(() =>
    isSecret || isBool ? "" : entry.value === null || entry.value === undefined ? "" : String(entry.value),
  );
  const [checked, setChecked] = useState(entry.value === true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entryText = entry.value === null || entry.value === undefined ? "" : String(entry.value);
  const dirty = isBool ? checked !== entry.value : draft !== entryText;

  function cancelEdit() {
    setDraft(entryText);
    setChecked(entry.value === true);
    setError(null);
  }

  function parseValue(): unknown {
    if (isBool) return checked;
    if (entry.type === "integer") {
      const n = Number(draft);
      if (!Number.isInteger(n)) throw new Error("Must be an integer.");
      return n;
    }
    if (entry.type === "number") {
      const n = Number(draft);
      if (!Number.isFinite(n)) throw new Error("Must be a number.");
      return n;
    }
    return draft;
  }

  async function save() {
    if (pending || (!dirty && !isSecret)) return;
    let value: unknown;
    try {
      value = parseValue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid value.");
      return;
    }
    if (isSecret && (typeof value !== "string" || value.length === 0)) {
      setError("Enter a secret to store.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (saveFn) await saveFn(entry.key, value);
      else await aiApi.setConfig(entry.key, value);
      toast(`${entry.label} saved.`, { tone: "success" });
      if (isSecret) setDraft("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (resetFn) await resetFn(entry.key);
      else await aiApi.resetConfig(entry.key);
      toast(`${entry.label} reset to default.`, { tone: "success" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{entry.label}</p>
        <Badge size="sm" tone={sourceTone[entry.source]}>
          {entry.source}
        </Badge>
        {isSecret ? (
          <Badge size="sm" tone={entry.secretConfigured ? "success" : "warning"}>
            {entry.secretConfigured ? "Configured" : "Not set"}
          </Badge>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs text-zinc-500">{entry.description}</p>
      {canWrite ? (
        <div className="mt-2">
          {isBool ? (
            <Switch
              id={`cfg-${entry.key}`}
              label={checked ? "On" : "Off"}
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={pending}
            />
          ) : entry.type === "enum" && entry.options ? (
            <Select
              id={`cfg-${entry.key}`}
              value={draft || String(entry.value ?? entry.options[0])}
              onChange={(e) => setDraft(e.target.value)}
              disabled={pending}
              size="sm"
            >
              {entry.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={`cfg-${entry.key}`}
              type={isSecret ? "password" : entry.type === "string" ? "text" : "number"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={isSecret ? "Write-only — enter to replace" : String(entry.value ?? "")}
              autoComplete={isSecret ? "new-password" : "off"}
              disabled={pending}
              size="sm"
            />
          )}
          <div className="mt-2 flex gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={save} disabled={pending || (!dirty && !isSecret)}>
              {pending ? "Saving…" : "Save"}
            </Button>
            {dirty ? (
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={pending}>
                Cancel
              </Button>
            ) : null}
            {entry.source === "console" ? (
              <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={pending}>
                Reset
              </Button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-500">
          {isSecret ? "Write-only." : `Current: ${entry.value === null || entry.value === undefined ? "—" : String(entry.value)}`}
        </p>
      )}
    </div>
  );
}
