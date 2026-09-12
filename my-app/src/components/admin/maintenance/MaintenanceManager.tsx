"use client";

import { useState } from "react";
import { KeyRound, Power, ShieldCheck } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Switch } from "@/src/components/ui/switch";
import { useToast } from "@/src/components/ui/toast";
import { ConfigField } from "@/src/components/admin/ai/ConfigField";
import { useAdminFetch } from "@/src/components/admin/ai/useAdminFetch";
import { AISection, SectionError, SectionSkeleton } from "@/src/components/admin/ai/Section";
import { HistoryPanel } from "@/src/components/admin/settings/HistoryPanel";
import { settingsApi, type SettingEntry } from "@/src/components/admin/settings/types";

const EDITABLE_KEYS = [
  "maintenance.message",
  "maintenance.estimatedEndTime",
  "maintenance.allowAdminAccess",
  "maintenance.allowAuthentication",
];

function entryMap(entries: SettingEntry[]): Map<string, SettingEntry> {
  return new Map(entries.map((e) => [e.key, e]));
}

function boolOf(entries: Map<string, SettingEntry>, key: string, fallback: boolean): boolean {
  const v = entries.get(key)?.value;
  return typeof v === "boolean" ? v : fallback;
}

/**
 * Maintenance console: live status, the five controls, change history.
 * Enabling/disabling always confirms with the effective consequences;
 * turning admin access off requires acknowledging database-only recovery.
 */
export function MaintenanceManager({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useAdminFetch<{ entries: SettingEntry[] }>(
    "/api/admin/settings",
  );
  const [confirming, setConfirming] = useState<null | { enable: boolean }>(null);
  const [ackLockout, setAckLockout] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const entries = entryMap(data?.entries ?? []);
  const enabled = boolOf(entries, "maintenance.enabled", false);
  const allowAdminAccess = boolOf(entries, "maintenance.allowAdminAccess", true);
  const allowAuthentication = boolOf(entries, "maintenance.allowAuthentication", true);
  const editable = EDITABLE_KEYS.flatMap((k) => {
    const e = entries.get(k);
    return e ? [e] : [];
  });

  async function flip(next: boolean) {
    if (pending) return;
    setPending(true);
    setConfirmError(null);
    try {
      await settingsApi.save("maintenance.enabled", next);
      toast(next ? "Maintenance mode enabled." : "Maintenance mode disabled.", { tone: "success" });
      setConfirming(null);
      setAckLockout(false);
      retry();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const fullLockout = !allowAdminAccess;

  return (
    <div className="grid content-start gap-4 sm:gap-5">
      {loading && entries.size === 0 ? (
        <SectionSkeleton rows={4} />
      ) : error && entries.size === 0 ? (
        <SectionError message={error} onRetry={retry} />
      ) : (
        <>
          <AISection
            title="Status"
            description="Live maintenance posture. Staff bypass follows the access toggles below — nothing is hardcoded."
            action={
              <span className="flex items-center gap-2">
                <Badge size="sm" tone={enabled ? "warning" : "success"}>
                  {enabled ? "MAINTENANCE ON" : "OPERATIONAL"}
                </Badge>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={enabled ? "primary" : "secondary"}
                    onClick={() => {
                      setConfirmError(null);
                      setAckLockout(false);
                      setConfirming({ enable: !enabled });
                    }}
                  >
                    <Power size={14} aria-hidden="true" />
                    {enabled ? "Disable" : "Enable"}
                  </Button>
                ) : null}
              </span>
            }
          >
            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  label: "Admin access",
                  allowed: allowAdminAccess,
                  icon: ShieldCheck,
                },
                {
                  label: "Sign-in / registration",
                  allowed: allowAuthentication,
                  icon: KeyRound,
                },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="flex items-center gap-2.5 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900/60"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.allowed ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"}`}
                    >
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                        {row.label}
                      </dt>
                      <dd>
                        <Badge size="sm" tone={row.allowed ? "success" : "danger"}>
                          {row.allowed ? "Allowed" : "Blocked"}
                        </Badge>
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </AISection>

          <AISection
            title="Configuration"
            description="Message, expected end, and access rules. Every save validates and audits."
          >
            <div className="grid gap-2 lg:grid-cols-2">
              {editable.map((entry) => (
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
                  onChanged={retry}
                  saveFn={(key, value) => settingsApi.save(key, value)}
                  resetFn={(key) => settingsApi.reset(key)}
                />
              ))}
            </div>
          </AISection>

          <AISection title="Change history" description="Maintenance writes and resets, newest first.">
            <HistoryPanel keyPrefix="maintenance." />
          </AISection>
        </>
      )}

      {confirming ? (
        <Dialog
          open
          onClose={() => (pending ? undefined : setConfirming(null))}
          title={confirming.enable ? "Enable maintenance mode?" : "Disable maintenance mode?"}
          footer={
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirming.enable ? "destructive" : "primary"}
                onClick={() => flip(confirming.enable)}
                disabled={pending || (confirming.enable && fullLockout && !ackLockout)}
              >
                {pending ? "Working…" : confirming.enable ? "Enable maintenance" : "Resume service"}
              </Button>
            </>
          }
        >
          <div className="grid gap-3 text-sm">
            {confirming.enable ? (
              <>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Normal users immediately see the downtime page and API 503s.
                  {allowAdminAccess
                    ? " Staff keep full access."
                    : " Staff are locked out too."}
                  {!allowAuthentication ? " Nobody can sign in or register." : ""}
                </p>
                {fullLockout ? (
                  <div className="rounded-lg border border-red-600/30 bg-red-50 p-3 dark:bg-red-950">
                    <Switch
                      id="maintenance-ack-lockout"
                      label="I understand the lockout"
                      description="No one — including admins — can access the system until this is reverted directly in the database. There is no UI recovery from this state."
                      checked={ackLockout}
                      onChange={(e) => setAckLockout(e.target.checked)}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-zinc-600 dark:text-zinc-400">
                Service resumes immediately for everyone on the next request.
              </p>
            )}
            {confirmError ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {confirmError}
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
