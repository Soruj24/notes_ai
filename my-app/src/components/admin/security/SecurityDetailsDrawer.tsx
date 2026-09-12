"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { EmptyState } from "@/src/components/ui/empty-state";
import { formatDateTime } from "./SecurityTable";
import { fetchSecurityEventDetail, type SecurityEventDetail, type SecuritySeverity } from "./types";

const severityTone: Record<SecuritySeverity, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

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

/** Full event inspect: actor, network, sanitized payload. Never shows secrets. */
export function SecurityDetailsDrawer({
  eventId,
  onClose,
}: {
  eventId: string | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={eventId !== null} onClose={onClose} side="right" label="Security event">
      {eventId ? <DrawerBody key={eventId} eventId={eventId} /> : null}
    </Drawer>
  );
}

function DrawerBody({ eventId }: { eventId: string }) {
  const [detail, setDetail] = useState<SecurityEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    fetchSecurityEventDetail(eventId)
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
  }, [eventId, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading event" className="grid gap-2 p-4">
        <span className="sr-only">Loading event…</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Couldn't load event"
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
      <Section title="Event">
        <dl className="grid gap-1.5">
          <Row label="Type">
            <span className="font-mono text-xs font-semibold">{detail.type}</span>{" "}
            <Badge size="sm" tone={severityTone[detail.severity]}>
              {detail.severity}
            </Badge>
          </Row>
          <Row label="Time">{formatDateTime(detail.createdAt)}</Row>
        </dl>
      </Section>
      <Section title="Actor">
        <dl className="grid gap-1.5">
          <Row label="Email">{detail.email || "—"}</Row>
          <Row label="IP">{detail.ipAddress ?? "—"}</Row>
          <Row label="User agent">
            <span className="text-xs">{detail.userAgent ?? "—"}</span>
          </Row>
          {detail.user ? (
            <Row label="Account">
              {detail.user.name} · {detail.user.status}
            </Row>
          ) : null}
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
        <p className="mt-2 text-[11px] text-zinc-500">
          Payloads are sanitized at write time — secrets are never stored.
        </p>
      </Section>
    </div>
  );
}
