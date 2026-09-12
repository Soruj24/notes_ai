"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { EmptyState } from "@/src/components/ui/empty-state";
import { formatDateTime } from "./AuditTable";
import { fetchAuditDetail, type AuditDetail } from "./types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 last:border-0 dark:border-zinc-900">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-24 shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

/** Full entry inspect: actor, target, network, before/after payload. */
export function AuditDetailsDrawer({
  entryId,
  onClose,
}: {
  entryId: string | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={entryId !== null} onClose={onClose} side="right" label="Audit entry">
      {entryId ? <DrawerBody key={entryId} entryId={entryId} /> : null}
    </Drawer>
  );
}

function DrawerBody({ entryId }: { entryId: string }) {
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    fetchAuditDetail(entryId)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setError(null);
        }
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
  }, [entryId, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading entry" className="grid gap-2 p-4">
        <span className="sr-only">Loading entry…</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Couldn't load entry"
        description={error ?? "Entry not found."}
        action={
          <Button type="button" size="sm" variant="secondary" onClick={retry}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Section title="Action">
        <dl className="grid gap-1.5">
          <Row label="Action">
            <span className="font-mono text-xs font-semibold">{detail.action}</span>{" "}
            <Badge size="sm" tone={detail.result === "denied" ? "danger" : "success"}>
              {detail.result === "denied" ? "DENIED" : "SUCCESS"}
            </Badge>
          </Row>
          <Row label="Time">{formatDateTime(detail.timestamp)}</Row>
          <Row label="Resource">
            {[detail.resourceType, detail.resourceId].filter(Boolean).join(" · ") || "—"}
          </Row>
          {detail.workspaceId ? <Row label="Workspace">{detail.workspaceId}</Row> : null}
        </dl>
      </Section>
      <Section title="Admin">
        <dl className="grid gap-1.5">
          <Row label="Name">{detail.actorName}</Row>
          <Row label="Email">{detail.actorEmail || "—"}</Row>
          <Row label="Role">{detail.actorRole ?? "—"}</Row>
          <Row label="Actor ID">
            <span className="font-mono text-xs">{detail.actorId}</span>
          </Row>
        </dl>
      </Section>
      <Section title="Network">
        <dl className="grid gap-1.5">
          <Row label="IP">{detail.ipAddress ?? "—"}</Row>
          <Row label="User agent">
            <span className="text-xs">{detail.userAgent ?? "—"}</span>
          </Row>
        </dl>
      </Section>
      <Section title="Details">
        {detail.metadata ? (
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            {JSON.stringify(detail.metadata, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-zinc-500">No payload recorded.</p>
        )}
      </Section>
      <Section title="Integrity">
        <p className="text-xs text-zinc-500">
          Entry <span className="font-mono">{detail.id}</span> is append-only: the API exposes no
          update or delete operations, and the model layer rejects mutations.
        </p>
      </Section>
    </div>
  );
}
