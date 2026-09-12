"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { UserActivityPanel } from "./UserActivityPanel";
import { formatDate } from "./UserTable";
import {
  fetchMemberships,
  fetchSessions,
  fetchUserDetail,
  patchUserName,
  revokeSessions,
  type AdminUserDetail,
  type AdminUser,
  type MembershipSummary,
  type SessionSummary,
  type StatusAction,
} from "./types";
import type { UserCapabilities } from "./UserTable";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 last:border-0 dark:border-zinc-900">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

/** Full user inspect: profile edit, sessions, memberships, activity. */
export function UserDetailsDrawer({
  userId,
  can,
  actorRole,
  onClose,
  onChanged,
  onStatus,
  onRole,
}: {
  userId: string | null;
  can: UserCapabilities & { revoke: boolean };
  actorRole: PlatformRole | null;
  onClose: () => void;
  onChanged: (u: AdminUser) => void;
  onStatus: (u: AdminUser, action: StatusAction) => void;
  onRole: (u: AdminUser) => void;
}) {
  // Remount per inspected user so loading starts true and prior state clears.
  return (
    <Drawer open={userId !== null} onClose={onClose} side="right" label="User details">
      {userId ? (
        <DrawerBody
          key={userId}
          userId={userId}
          can={can}
          actorRole={actorRole}
          onChanged={onChanged}
          onStatus={onStatus}
          onRole={onRole}
        />
      ) : null}
    </Drawer>
  );
}

interface SessionView extends SessionSummary {
  expired: boolean;
}

function DrawerBody({
  userId,
  can,
  actorRole,
  onChanged,
  onStatus,
  onRole,
}: {
  userId: string;
  can: UserCapabilities & { revoke: boolean };
  actorRole: PlatformRole | null;
  onChanged: (u: AdminUser) => void;
  onStatus: (u: AdminUser, action: StatusAction) => void;
  onRole: (u: AdminUser) => void;
}) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  const [memberships, setMemberships] = useState<MembershipSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchUserDetail(userId), fetchSessions(userId), fetchMemberships(userId)])
      .then(([d, s, m]) => {
        if (cancelled) return;
        const now = Date.now();
        setDetail(d);
        setSessions(s.map((session) => ({ ...session, expired: new Date(session.expiresAt).getTime() < now })));
        setMemberships(m);
        setNameDraft(d.name);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  async function saveName() {
    if (!detail || savingName) return;
    const next = nameDraft.trim();
    if (!next || next === detail.name) return;
    setSavingName(true);
    try {
      const { user } = await patchUserName(detail.id, next);
      setDetail(user);
      onChanged(user);
      toast("Name updated.", { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setSavingName(false);
    }
  }

  async function doRevoke() {
    if (!detail || revoking) return;
    setRevoking(true);
    try {
      const { revoked } = await revokeSessions(detail.id);
      setSessions([]);
      setConfirmingRevoke(false);
      toast(`Revoked ${revoked} session${revoked === 1 ? "" : "s"}.`, { tone: "success" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      {loading ? (
        <div role="status" aria-busy="true" aria-label="Loading user" className="grid gap-2 p-4">
          <span className="sr-only">Loading user…</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : error || !detail ? (
        <EmptyState
          title="Couldn't load user"
          description={error ?? "User not found."}
          action={
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          }
        />
      ) : (
        <div>
          <Section title="Profile">
            <dl className="grid gap-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Email</dt>
                <dd className="min-w-0 truncate">{detail.email}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Role</dt>
                <dd>
                  <Badge size="sm" tone={detail.role ? "accent" : "neutral"}>
                    {detail.role ?? "USER"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-20 shrink-0 text-zinc-500">Status</dt>
                <dd>
                  <Badge
                    size="sm"
                    tone={detail.status === "ACTIVE" ? "success" : detail.status === "SUSPENDED" ? "warning" : "danger"}
                  >
                    {detail.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex gap-2 text-xs text-zinc-500">
                <dt className="w-20 shrink-0">Joined</dt>
                <dd>{formatDate(detail.createdAt)}</dd>
              </div>
              <div className="flex gap-2 text-xs text-zinc-500">
                <dt className="w-20 shrink-0">Last active</dt>
                <dd>{formatDate(detail.lastActiveAt)}</dd>
              </div>
              {detail.suspensionReason ? (
                <div className="flex gap-2 text-xs">
                  <dt className="w-20 shrink-0 text-zinc-500">Reason</dt>
                  <dd className="min-w-0">{detail.suspensionReason}</dd>
                </div>
              ) : null}
            </dl>
            {can.edit ? (
              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveName();
                }}
              >
                <Input
                  id="user-detail-name"
                  label="Display name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={64}
                  size="sm"
                  disabled={savingName}
                />
                <Button type="submit" size="sm" variant="secondary" disabled={savingName || !nameDraft.trim() || nameDraft.trim() === detail.name}>
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </form>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {can.role ? (
                <Button type="button" size="sm" variant="outline" onClick={() => onRole(detail)}>
                  Change role…
                </Button>
              ) : null}
              {can.suspend && detail.status === "ACTIVE" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => onStatus(detail, "suspend")}>
                  Suspend…
                </Button>
              ) : null}
              {can.suspend && detail.status === "SUSPENDED" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => onStatus(detail, "unsuspend")}>
                  Unsuspend…
                </Button>
              ) : null}
              <span className="sr-only">Acting as {actorRole ?? "no role"}</span>
            </div>
          </Section>
          <Section title={`Sessions (${sessions?.length ?? 0})`}>
            {sessions?.length ? (
              <div className="grid gap-2">
                <ul className="grid gap-1.5">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate font-mono" title={s.id}>
                        {s.id.slice(0, 12)}…
                      </span>
                      <Badge size="sm" tone={s.expired ? "neutral" : "success"}>
                        {s.expired ? "Expired" : "Active"}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {can.revoke ? (
                  confirmingRevoke ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-zinc-500">Sign this user out everywhere?</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingRevoke(false)} disabled={revoking}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void doRevoke()} disabled={revoking}>
                        {revoking ? "Revoking…" : "Revoke all"}
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmingRevoke(true)}>
                      Revoke all sessions
                    </Button>
                  )
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No active sessions.</p>
            )}
          </Section>
          <Section title={`Workspaces (${memberships?.length ?? 0})`}>
            {memberships?.length ? (
              <ul className="grid gap-1.5">
                {memberships.map((m) => (
                  <li key={m.workspaceId} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{m.workspaceName}</span>
                    <Badge size="sm" tone="neutral">
                      {m.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">Not a member of any workspace.</p>
            )}
          </Section>
          <Section title="Activity">
            <UserActivityPanel userId={detail.id} />
          </Section>
        </div>
      )}
    </>
  );
}
