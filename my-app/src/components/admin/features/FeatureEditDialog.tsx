"use client";

import { useState } from "react";
import { FEATURE_FLAG_ENVS } from "@/src/lib/db/admin-enums";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { updateFeature, type FeatureRow } from "./types";

/** Full flag editor: kill switch, rollout, environment, role + user targeting. */
export function FeatureEditDialog({
  feature,
  onClose,
  onSaved,
}: {
  feature: FeatureRow;
  onClose: () => void;
  onSaved: (updated: FeatureRow) => void;
}) {
  const [enabled, setEnabled] = useState(feature.enabled);
  const [rollout, setRollout] = useState(String(feature.rolloutPercentage));
  const [environment, setEnvironment] = useState(feature.environment);
  const [roles, setRoles] = useState<string[]>(feature.targetRoles);
  const [emails, setEmails] = useState<string[]>(feature.targetUsers.map((u) => u.email));
  const [emailDraft, setEmailDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(role: string, on: boolean) {
    setRoles((prev) => (on ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  async function save() {
    if (pending) return;
    const rolloutNum = Number(rollout);
    if (!Number.isInteger(rolloutNum) || rolloutNum < 0 || rolloutNum > 100) {
      setError("Rollout must be an integer between 0 and 100.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const updated = await updateFeature(feature.key, {
        enabled,
        rolloutPercentage: rolloutNum,
        environment,
        targetRoles: roles,
        targetUserEmails: emails,
      });
      onSaved(updated);
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
      title={feature.name}
      description={`${feature.key} · backend enforced, audited`}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save flag"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Switch
          id="flag-enabled"
          label={enabled ? "Enabled" : "Disabled"}
          description={enabled ? "Feature serves traffic per targeting." : "Kill switch: off for everyone."}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={pending}
        />
        <Input
          id="flag-rollout"
          label="Rollout percentage (0–100)"
          value={rollout}
          onChange={(e) => setRollout(e.target.value)}
          inputMode="numeric"
          disabled={pending}
          hint="Deterministic per user. 100 = everyone (subject to roles/users below when set)."
          size="sm"
        />
        <Select
          id="flag-environment"
          label="Environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          disabled={pending}
          size="sm"
        >
          {FEATURE_FLAG_ENVS.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Role targeting (empty = all roles)
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_ROLES.map((role) => {
              const on = roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRole(role, !on)}
                  disabled={pending}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                    on
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            User targeting (empty = all users)
          </span>
          {emails.length ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {emails.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-1 rounded-full border border-zinc-200 py-0.5 pr-1 pl-2.5 text-[11px] dark:border-zinc-800"
                >
                  {email}
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                    disabled={pending}
                    className="cursor-pointer rounded-full px-1.5 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-500 disabled:opacity-50 dark:hover:bg-zinc-900"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const next = emailDraft.trim().toLowerCase();
              if (next && !emails.includes(next)) setEmails((prev) => [...prev, next]);
              setEmailDraft("");
            }}
          >
            <Input
              id="flag-user-email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              disabled={pending}
              size="sm"
              aria-label="Add user email"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={pending || !emailDraft.trim()}>
              Add
            </Button>
          </form>
        </div>
        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
