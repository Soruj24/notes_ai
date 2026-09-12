"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { EmptyState } from "@/src/components/ui/empty-state";

import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { AISection, SectionError, SectionSkeleton, ConfirmDialog } from "./Section";
import { useAdminFetch } from "./useAdminFetch";
import { aiApi, type CatalogModel } from "./types";

interface ModelOverrides {
  enabled: boolean;
  temperature: string;
  maxTokens: string;
  dailyRequestLimit: string;
  dailyTokenLimit: string;
}

function overridesOf(m: CatalogModel): ModelOverrides {
  return {
    enabled: m.enabled,
    temperature: m.temperature?.toString() ?? "",
    maxTokens: m.maxTokens?.toString() ?? "",
    dailyRequestLimit: m.dailyRequestLimit?.toString() ?? "",
    dailyTokenLimit: m.dailyTokenLimit?.toString() ?? "",
  };
}

function ModelForm({
  form,
  setForm,
  pending,
  error,
}: {
  form: ModelOverrides;
  setForm: (f: ModelOverrides) => void;
  pending: boolean;
  error: string | null;
}) {
  const set = (k: keyof ModelOverrides, v: string | boolean) =>
    setForm({ ...form, [k]: v });
  return (
    <div className="grid gap-3">
      <Switch
        id="model-enabled"
        label="Available (unavailable models are never selected)"
        checked={form.enabled}
        onChange={(e) => set("enabled", e.target.checked)}
        disabled={pending}
      />
      <Input
        id="model-temperature"
        label="Temperature override (blank = global)"
        value={form.temperature}
        onChange={(e) => set("temperature", e.target.value)}
        placeholder="e.g. 0.2"
        disabled={pending}
        size="sm"
      />
      <Input
        id="model-max-tokens"
        label="Max output tokens override (blank = global)"
        value={form.maxTokens}
        onChange={(e) => set("maxTokens", e.target.value)}
        placeholder="e.g. 2000"
        disabled={pending}
        size="sm"
      />
      <Input
        id="model-req-limit"
        label="Requests per user / day (blank = global, 0 = unlimited)"
        value={form.dailyRequestLimit}
        onChange={(e) => set("dailyRequestLimit", e.target.value)}
        placeholder="e.g. 50"
        disabled={pending}
        size="sm"
      />
      <Input
        id="model-tok-limit"
        label="Tokens per user / day (blank = global, 0 = unlimited)"
        value={form.dailyTokenLimit}
        onChange={(e) => set("dailyTokenLimit", e.target.value)}
        placeholder="e.g. 100000"
        disabled={pending}
        size="sm"
      />
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Section 3 — Models: availability, default, fallback, per-model budgets. */
export function ModelsSection({ canConfigure, onChanged }: { canConfigure: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useAdminFetch<{ models: CatalogModel[] }>("/api/admin/ai/models");
  const [editing, setEditing] = useState<{ model: CatalogModel; isNew: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState("");
  const [confirmFallback, setConfirmFallback] = useState<CatalogModel | null>(null);

  const models = data?.models ?? [];
  const providers = [...new Map(models.map((m) => [m.providerId, m.providerLabel])).entries()];

  async function setDefault(m: CatalogModel) {
    try {
      await aiApi.setConfig("ai.model", m.name);
      toast(`Default model set to ${m.name}.`, { tone: "success" });
      retry();
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    }
  }

  async function toggleEnabled(m: CatalogModel, on: boolean) {
    try {
      const entries = models
        .filter((x) => x.source === "configured")
        .map((x) => ({
          name: x.name,
          providerId: x.providerId,
          enabled: x.name === m.name && x.providerId === m.providerId ? on : x.enabled,
          ...(x.temperature !== undefined ? { temperature: x.temperature } : {}),
          ...(x.maxTokens !== undefined ? { maxTokens: x.maxTokens } : {}),
          ...(x.dailyRequestLimit !== undefined ? { dailyRequestLimit: x.dailyRequestLimit } : {}),
          ...(x.dailyTokenLimit !== undefined ? { dailyTokenLimit: x.dailyTokenLimit } : {}),
        }));
      const exists = entries.some((x) => x.name === m.name && x.providerId === m.providerId);
      await aiApi.setConfig(
        "ai.models",
        exists ? entries : [...entries, { name: m.name, providerId: m.providerId, enabled: on }],
      );
      toast(`Model ${on ? "enabled" : "disabled"}.`, { tone: "success" });
      retry();
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    }
  }

  async function setFallback(m: CatalogModel | null) {
    try {
      await aiApi.setConfig("ai.fallback", m ? { providerId: m.providerId, model: m.name } : null);
      toast(m ? `Fallback set to ${m.name}.` : "Fallback cleared.", { tone: "success" });
      setConfirmFallback(null);
      retry();
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    }
  }

  return (
    <AISection
      title="Models"
      description="Availability, default, fallback, and per-model budgets. Disabled models are never selected."
      action={
        canConfigure ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
            Add custom model
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : error || !data ? (
        <SectionError message={error ?? "No data returned."} onRetry={retry} />
      ) : models.length === 0 ? (
        <EmptyState
          title="No models found"
          description="No reachable providers and no configured entries. Add a provider first."
        />
      ) : (
        <div className="grid gap-3">
          {adding && canConfigure ? (
            <div className="flex max-w-xl flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <Input
                id="new-model-name"
                label="Model name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. my-finetune"
                maxLength={100}
                size="sm"
                className="max-w-56"
              />
              <Select
                id="new-model-provider"
                label="Provider"
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                size="sm"
                className="max-w-56"
              >
                <option value="">Select…</option>
                {providers.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!newName.trim() || !newProvider}
                onClick={() => {
                  setEditing({
                    model: {
                      name: newName.trim(),
                      providerId: newProvider,
                      providerLabel: providers.find(([id]) => id === newProvider)?.[1] ?? newProvider,
                      source: "discovered",
                      enabled: true,
                      isDefault: false,
                      isFallback: false,
                    },
                    isNew: true,
                  });
                  setAdding(false);
                  setNewName("");
                  setNewProvider("");
                }}
              >
                Configure…
              </Button>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th scope="col" className="px-4 py-2.5 font-medium">Model</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Provider</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Budgets</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {models.map((m) => (
                  <tr key={`${m.providerId}/${m.name}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="px-4 py-2.5">
                      <p className="truncate font-mono text-xs font-medium">{m.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {m.source}
                        {m.temperature !== undefined ? ` · temp ${m.temperature}` : ""}
                        {m.maxTokens !== undefined ? ` · ${m.maxTokens} tok` : ""}
                      </p>
                    </td>
                    <td className="max-w-36 truncate px-4 py-2.5 text-xs text-zinc-500">{m.providerLabel}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        <Badge size="sm" tone={m.enabled ? "success" : "neutral"}>
                          {m.enabled ? "Available" : "Disabled"}
                        </Badge>
                        {m.isDefault ? (
                          <Badge size="sm" tone="accent">Default</Badge>
                        ) : null}
                        {m.isFallback ? (
                          <Badge size="sm" tone="warning">Fallback</Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] whitespace-nowrap text-zinc-500">
                      {m.dailyRequestLimit !== undefined || m.dailyTokenLimit !== undefined
                        ? `${m.dailyRequestLimit ?? "—"} req · ${m.dailyTokenLimit ?? "—"} tok`
                        : "Global"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canConfigure ? (
                        <span className="inline-flex flex-wrap justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => toggleEnabled(m, !m.enabled)}>
                            {m.enabled ? "Disable" : "Enable"}
                          </Button>
                          {!m.isDefault ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => setDefault(m)}>
                              Default
                            </Button>
                          ) : null}
                          {!m.isFallback ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmFallback(m)}>
                              Fallback
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="ghost" onClick={() => setFallback(null)}>
                              Clear fallback
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing({ model: m, isNew: m.source !== "configured" })}>
                            Edit
                          </Button>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing ? (
        <ModelDialogHost
          model={editing.model}
          isNew={editing.isNew}
          models={models}
          onClose={() => setEditing(null)}
          onSaved={() => {
            retry();
            onChanged();
          }}
        />
      ) : null}
      {confirmFallback ? (
        <ConfirmDialog
          title={`Use ${confirmFallback.name} as fallback?`}
          body="When the primary provider is unreachable, turns run on this model instead. Audited."
          confirmLabel="Set fallback"
          onClose={() => setConfirmFallback(null)}
          onConfirm={() => setFallback(confirmFallback)}
        />
      ) : null}
    </AISection>
  );
}

/** Host that threads the current catalog into the save. */
function ModelDialogHost({
  model,
  isNew,
  models,
  onClose,
  onSaved,
}: {
  model: CatalogModel;
  isNew: boolean;
  models: CatalogModel[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(overridesOf(model));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (pending) return;
    const parse = (raw: string): number | undefined => {
      const t = raw.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : NaN;
    };
    const temperature = parse(form.temperature);
    const maxTokens = parse(form.maxTokens);
    const dailyRequestLimit = parse(form.dailyRequestLimit);
    const dailyTokenLimit = parse(form.dailyTokenLimit);
    if (
      temperature === undefined ||
      maxTokens === undefined ||
      dailyRequestLimit === undefined ||
      dailyTokenLimit === undefined
    ) {
      setError("Numeric fields must be numbers or blank (inherit).");
      return;
    }
    const entry = {
      name: model.name,
      providerId: model.providerId,
      enabled: form.enabled,
      ...(form.temperature.trim() ? { temperature } : {}),
      ...(form.maxTokens.trim() ? { maxTokens } : {}),
      ...(form.dailyRequestLimit.trim() ? { dailyRequestLimit } : {}),
      ...(form.dailyTokenLimit.trim() ? { dailyTokenLimit } : {}),
    };
    const rest = models
      .filter((m) => m.source === "configured" && !(m.name === model.name && m.providerId === model.providerId))
      .map((m) => ({
        name: m.name,
        providerId: m.providerId,
        enabled: m.enabled,
        ...(m.temperature !== undefined ? { temperature: m.temperature } : {}),
        ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
        ...(m.dailyRequestLimit !== undefined ? { dailyRequestLimit: m.dailyRequestLimit } : {}),
        ...(m.dailyTokenLimit !== undefined ? { dailyTokenLimit: m.dailyTokenLimit } : {}),
      }));
    setPending(true);
    setError(null);
    try {
      await aiApi.setConfig("ai.models", [...rest, entry]);
      toast(`Model ${model.name} saved.`, { tone: "success" });
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
      title={`${isNew ? "Configure" : "Edit"} model`}
      description={`${model.name} · ${model.providerLabel}`}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save model"}
          </Button>
        </>
      }
    >
      <ModelForm form={form} setForm={setForm} pending={pending} error={error} />
    </Dialog>
  );
}
