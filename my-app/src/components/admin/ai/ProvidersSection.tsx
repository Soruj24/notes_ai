"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { AISection, SectionError, SectionSkeleton, ConfirmDialog } from "./Section";

import { ConfigField, type WriteAccess } from "./ConfigField";
import { useAdminFetch } from "./useAdminFetch";
import { aiApi, type ConfigEntry, type ProviderEntry, type ProviderInfo } from "./types";

interface ProviderDraft {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

function ProviderForm(props: {
  editing: boolean;
  id: string;
  setId: (v: string) => void;
  label: string;
  setLabel: (v: string) => void;
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="grid gap-3">
      {!props.editing ? (
        <Input
          id="provider-id"
          label="ID (a-z, 0-9, dashes)"
          value={props.id}
          onChange={(e) => props.setId(e.target.value)}
          placeholder="ollama-local"
          maxLength={32}
          disabled={props.pending}
        />
      ) : null}
      <Input
        id="provider-label"
        label="Label"
        value={props.label}
        onChange={(e) => props.setLabel(e.target.value)}
        maxLength={60}
        disabled={props.pending}
      />
      <Input
        id="provider-base-url"
        label="Base URL (http/https)"
        value={props.baseUrl}
        onChange={(e) => props.setBaseUrl(e.target.value)}
        placeholder="http://localhost:11434/v1"
        maxLength={200}
        disabled={props.pending}
      />
      <Input
        id="provider-api-key"
        label={props.editing ? "API key (blank keeps stored secret)" : "API key (optional)"}
        type="password"
        value={props.apiKey}
        onChange={(e) => props.setApiKey(e.target.value)}
        autoComplete="new-password"
        disabled={props.pending}
      />
      <Switch
        id="provider-enabled"
        label="Enabled"
        checked={props.enabled}
        onChange={(e) => props.setEnabled(e.target.checked)}
        disabled={props.pending}
      />
      {props.error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

/** Section 2 — Providers: catalog CRUD (secrets write-only) + legacy endpoint fields. */
export function ProvidersSection({
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
  const { toast } = useToast();
  const { data, loading, error, retry } = useAdminFetch<ProviderInfo>("/api/admin/ai/providers");
  const [dialog, setDialog] = useState<{ draft: ProviderDraft | null } | null>(null);
  const [deleting, setDeleting] = useState<ProviderEntry | null>(null);

  const canEdit = access.canConfigure;

  async function saveProviders(list: ProviderEntry[]) {
    await aiApi.setConfig(
      "ai.providers",
      list.map((p) => ({ id: p.id, label: p.label, enabled: p.enabled, baseUrl: p.baseUrl })),
    );
    toast("Providers saved.", { tone: "success" });
    retry();
    onChanged();
  }

  async function toggleEnabled(provider: ProviderEntry, on: boolean) {
    try {
      await saveProviders(
        (data?.providers ?? []).map((p) => (p.id === provider.id ? { ...p, enabled: on } : p)),
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    }
  }

  async function removeProvider(provider: ProviderEntry) {
    await saveProviders((data?.providers ?? []).filter((p) => p.id !== provider.id));
    setDeleting(null);
  }

  const legacy = entries.filter((e) =>
    ["ai.provider.baseUrl", "ai.provider.apiKey", "ai.embeddings.provider", "ai.embeddings.model"].includes(e.key),
  );

  return (
    <AISection
      title="Providers"
      description="Connection catalog (keys write-only, never displayed) plus legacy default-endpoint fields."
      action={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setDialog({ draft: null })}>
            Add provider
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : (
        <div className="grid gap-3">
          {data.providers.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No providers configured — using the environment default ({data.baseUrl}).
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {data.providers.map((p) => (
                <li key={p.id} className="rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.label}</p>
                    <Badge size="sm" tone={p.enabled ? "success" : "neutral"}>
                      {p.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge size="sm" tone={p.reachable ? "success" : "danger"}>
                      {p.reachable ? "Reachable" : "Down"}
                    </Badge>
                    <Badge size="sm" tone={p.apiKeyConfigured ? "success" : "warning"}>
                      {p.apiKeyConfigured ? "Key set" : "No key"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">{p.baseUrl}</p>
                  {canEdit ? (
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDialog({
                            draft: { id: p.id, label: p.label, baseUrl: p.baseUrl, apiKey: "", enabled: p.enabled },
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toggleEnabled(p, !p.enabled)}
                      >
                        {p.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeleting(p)}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Default endpoint & embeddings
            </h3>
            {entriesLoading ? (
              <SectionSkeleton rows={2} />
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {legacy.map((entry) => (
                  <ConfigField
                    key={entry.key}
                    entry={entry}
                    canWrite={
                      entry.superadminOnly ? access.isSuperadmin && access.canConfigure : access.canConfigure
                    }
                    onChanged={() => {
                      retry();
                      onChanged();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {dialog ? (
        <ProviderDialogHost
          draft={dialog.draft}
          providers={data?.providers ?? []}
          onClose={() => setDialog(null)}
          onSaved={() => {
            retry();
            onChanged();
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete provider ${deleting.label}?`}
          body="Models referencing it become unresolvable until re-pointed (blocked while model entries or the fallback reference it). Audited."
          confirmLabel="Delete provider"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={() => removeProvider(deleting)}
        />
      ) : null}
    </AISection>
  );
}

/** Host that owns the save wiring (keeps the dialog presentational). */
function ProviderDialogHost({
  draft,
  providers,
  onClose,
  onSaved,
}: {
  draft: ProviderDraft | null;
  providers: ProviderEntry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState(draft?.id ?? "");
  const [label, setLabel] = useState(draft?.label ?? "");
  const [baseUrl, setBaseUrl] = useState(draft?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(draft?.enabled ?? true);

  async function save() {
    if (pending) return;
    const editing = draft !== null;
    const nextId = editing ? draft.id : id.trim().toLowerCase();
    const entry = {
      id: nextId,
      label: label.trim(),
      baseUrl: baseUrl.trim(),
      enabled,
      ...(apiKey.length > 0 ? { apiKey } : {}),
    };
    const merged = editing
      ? providers.map((p) => (p.id === draft.id ? { ...p, ...entry } : p))
      : [...providers, entry];
    // Redacted list entries carry no apiKey — the server preserves stored
    // secrets for entries whose write omits it.
    const payload = merged.map((p) => ({
      id: p.id,
      label: p.label,
      baseUrl: p.baseUrl,
      enabled: p.enabled,
      ...("apiKey" in p && typeof (p as { apiKey?: unknown }).apiKey === "string" && ((p as { apiKey?: string }).apiKey ?? "").length > 0
        ? { apiKey: (p as { apiKey?: string }).apiKey }
        : {}),
    }));
    setPending(true);
    setError(null);
    try {
      await aiApi.setConfig("ai.providers", payload);
      toast(editing ? "Provider updated." : "Provider added.", { tone: "success" });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={draft ? "Edit provider" : "Add provider"}
      description="OpenAI-compatible endpoint. Keys stay server-side."
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save provider"}
          </Button>
        </>
      }
    >
      <ProviderForm
        editing={draft !== null}
        id={id}
        setId={setId}
        label={label}
        setLabel={setLabel}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        enabled={enabled}
        setEnabled={setEnabled}
        pending={pending}
        error={error}
      />
    </Dialog>
  );
}
