"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { WorkspaceStatus } from "@/src/lib/db/enums";
import { formatDate } from "./WorkspaceTable";
import {
  fetchWorkspaceContent,
  fetchWorkspaceDetail,
  fetchWorkspaceMembers,
  fetchWorkspaceStats,
  formatBytes,
  type AdminWorkspace,
  type AdminWorkspaceDetail,
  type WorkspaceContent,
  type WorkspaceMember,
  type WorkspaceStats,
  type WorkspaceStatusAction,
} from "./types";
import type { WorkspaceCapabilities } from "./WorkspaceTable";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 last:border-0 dark:border-zinc-900">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

const statusTone: Record<WorkspaceStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
  DELETED: "danger",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="truncate text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

/** Full workspace inspect: owner, stats, members, content, lifecycle actions. */
export function WorkspaceDetailsDrawer({
  workspaceId,
  can,
  onClose,
  onStatus,
}: {
  workspaceId: string | null;
  can: WorkspaceCapabilities;
  onClose: () => void;
  onStatus: (w: AdminWorkspace, action: WorkspaceStatusAction) => void;
}) {
  // Remount per inspected workspace so loading starts true and prior state clears.
  return (
    <Drawer open={workspaceId !== null} onClose={onClose} side="right" label="Workspace details">
      {workspaceId ? (
        <DrawerBody key={workspaceId} workspaceId={workspaceId} can={can} onStatus={onStatus} />
      ) : null}
    </Drawer>
  );
}

function DrawerBody({
  workspaceId,
  can,
  onStatus,
}: {
  workspaceId: string;
  can: WorkspaceCapabilities;
  onStatus: (w: AdminWorkspace, action: WorkspaceStatusAction) => void;
}) {
  const [detail, setDetail] = useState<AdminWorkspaceDetail | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [content, setContent] = useState<WorkspaceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchWorkspaceDetail(workspaceId),
      fetchWorkspaceStats(workspaceId),
      fetchWorkspaceMembers(workspaceId),
      fetchWorkspaceContent(workspaceId),
    ])
      .then(([d, s, m, c]) => {
        if (cancelled) return;
        setDetail(d);
        setStats(s);
        setMembers(m);
        setContent(c);
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
  }, [workspaceId, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading workspace" className="grid gap-2 p-4">
        <span className="sr-only">Loading workspace…</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Couldn't load workspace"
        description={error ?? "Workspace not found."}
        action={
          <Button type="button" size="sm" variant="secondary" onClick={retry}>
            Retry
          </Button>
        }
      />
    );
  }

  const row: AdminWorkspace = {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    ownerId: detail.ownerId,
    ownerName: detail.owner?.name ?? "(deleted user)",
    status: detail.status,
    memberCount: stats?.members ?? 0,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };

  return (
    <div>
      <Section title="Workspace">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-zinc-500">Name</dt>
            <dd className="min-w-0 flex-1 truncate font-medium">{detail.name}</dd>
            <Badge size="sm" tone={statusTone[detail.status]}>
              {detail.status}
            </Badge>
          </div>
          {detail.description ? (
            <div className="flex gap-2 text-xs">
              <dt className="w-20 shrink-0 text-zinc-500">About</dt>
              <dd className="min-w-0">{detail.description}</dd>
            </div>
          ) : null}
          <div className="flex gap-2 text-xs text-zinc-500">
            <dt className="w-20 shrink-0">Created</dt>
            <dd>{formatDate(detail.createdAt)}</dd>
          </div>
          {detail.lastStatusChange ? (
            <div className="flex gap-2 text-xs">
              <dt className="w-20 shrink-0 text-zinc-500">Last change</dt>
              <dd className="min-w-0">
                <span className="font-mono">{detail.lastStatusChange.action}</span>
                {detail.lastStatusChange.reason ? (
                  <span className="text-zinc-500"> — {detail.lastStatusChange.reason}</span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {can.suspend && detail.status === "ACTIVE" ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => onStatus(row, "suspend")}>
                Suspend…
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onStatus(row, "archive")}>
                Archive…
              </Button>
            </>
          ) : null}
          {can.suspend && (detail.status === "SUSPENDED" || detail.status === "ARCHIVED") ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onStatus(row, "unsuspend")}>
              Restore to active…
            </Button>
          ) : null}
          {can.danger && detail.status !== "DELETED" ? (
            <Button type="button" size="sm" variant="destructive" onClick={() => onStatus(row, "delete")}>
              Delete…
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="Owner">
        {detail.owner ? (
          <dl className="grid gap-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-zinc-500">Name</dt>
              <dd className="min-w-0 truncate">{detail.owner.name}</dd>
            </div>
            <div className="flex gap-2 text-xs">
              <dt className="w-20 shrink-0 text-zinc-500">Email</dt>
              <dd className="min-w-0 truncate text-zinc-500">{detail.owner.email}</dd>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <dt className="w-20 shrink-0 text-zinc-500">Account</dt>
              <dd>
                <Badge size="sm" tone={detail.owner.status === "ACTIVE" ? "success" : "warning"}>
                  {detail.owner.status}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-zinc-500">Owner account no longer exists.</p>
        )}
      </Section>

      <Section title="Statistics">
        {stats ? (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Members" value={stats.members.toLocaleString()} />
            <Stat label="Notes" value={stats.notes.toLocaleString()} />
            <Stat
              label="Tasks"
              value={stats.tasks.toLocaleString()}
              hint={stats.tasks > 0 ? `${stats.tasksDone.toLocaleString()} done` : undefined}
            />
            <Stat label="Projects" value={stats.projects.toLocaleString()} />
            <Stat label="Goals" value={stats.goals.toLocaleString()} />
            <Stat label="Storage" value={formatBytes(stats.storageBytes)} hint={`${stats.attachments} files`} />
            <Stat label="AI requests" value={stats.aiMessages.toLocaleString()} hint={`${stats.aiConversations} chats`} />
            <Stat label="AI tokens" value={stats.aiTokens.toLocaleString()} />
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No statistics available.</p>
        )}
      </Section>

      <Section title={`Members (${members?.length ?? 0})`}>
        {members?.length ? (
          <ul className="grid gap-1.5">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-[11px] text-zinc-500">{m.email}</span>
                </span>
                <Badge size="sm" tone="neutral">
                  {m.role}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No members.</p>
        )}
      </Section>

      <Section title="Recent content">
        {content &&
        (content.notes.length + content.tasks.length + content.projects.length + content.goals.length > 0) ? (
          <div className="grid gap-3">
            {(
              [
                ["Notes", content.notes],
                ["Tasks", content.tasks],
                ["Projects", content.projects],
                ["Goals", content.goals],
              ] as const
            ).map(([label, items]) =>
              items.length ? (
                <div key={label}>
                  <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{label}</h4>
                  <ul className="grid gap-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        {item.status ? (
                          <span className="shrink-0 text-[11px] text-zinc-500">{item.status}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No content yet. Titles only — bodies stay private.</p>
        )}
      </Section>
    </div>
  );
}
