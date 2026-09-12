"use client";

import { useEffect, useState } from "react";
import { ENTITY_CONFIG, type ModEntity } from "@/src/lib/moderation";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Drawer } from "@/src/components/ui/drawer";
import { EmptyState } from "@/src/components/ui/empty-state";
import { formatDate } from "./ModerationTable";
import {
  availableActions,
  canPerform,
  fetchContentDetail,
  type ModAction,
  type ModCaps,
  type ModDetail,
  type ModItem,
} from "./types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-4 last:border-0 dark:border-zinc-900">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Read-only inspect: metadata, excerpt (never full body), history, lifecycle actions. */
export function InspectDrawer({
  entity,
  itemId,
  caps,
  onClose,
  onLifecycle,
}: {
  entity: ModEntity;
  itemId: string | null;
  caps: ModCaps;
  onClose: () => void;
  onLifecycle: (item: ModItem, action: ModAction) => void;
}) {
  const config = ENTITY_CONFIG[entity];
  return (
    <Drawer open={itemId !== null} onClose={onClose} side="right" label={`Inspect ${config.singular}`}>
      {itemId ? (
        <DrawerBody key={itemId} entity={entity} itemId={itemId} caps={caps} onLifecycle={onLifecycle} />
      ) : null}
    </Drawer>
  );
}

function DrawerBody({
  entity,
  itemId,
  caps,
  onLifecycle,
}: {
  entity: ModEntity;
  itemId: string;
  caps: ModCaps;
  onLifecycle: (item: ModItem, action: ModAction) => void;
}) {
  const config = ENTITY_CONFIG[entity];
  const [detail, setDetail] = useState<ModDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch-only effect: all state updates happen in promise callbacks.
  useEffect(() => {
    let cancelled = false;
    fetchContentDetail(entity, itemId)
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
  }, [entity, itemId, attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading item" className="grid gap-2 p-4">
        <span className="sr-only">Loading…</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Couldn't load item"
        description={error ?? "Not found."}
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
      <Section title={config.singular}>
        <dl className="grid gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-zinc-500">Title</dt>
            <dd className="min-w-0 flex-1 truncate font-medium">{detail.title}</dd>
            <Badge size="sm" tone={detail.trashed ? "danger" : "neutral"}>
              {detail.status}
            </Badge>
          </div>
          <div className="flex gap-2 text-xs text-zinc-500">
            <dt className="w-20 shrink-0">Workspace</dt>
            <dd className="min-w-0 truncate">{detail.workspaceName}</dd>
          </div>
          <div className="flex gap-2 text-xs text-zinc-500">
            <dt className="w-20 shrink-0">Updated</dt>
            <dd>{formatDate(detail.updatedAt)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {availableActions(entity, detail.status).map((action) => {
            if (!canPerform(caps, entity, action, detail!.status)) return null;
            const irreversible = action === "delete" || action === "purge";
            return (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={irreversible ? "destructive" : "outline"}
                onClick={() => onLifecycle(detail, action)}
              >
                {config.verbs[action]}…
              </Button>
            );
          })}
        </div>
      </Section>

      <Section title="Excerpt">
        {detail.excerpt ? (
          <blockquote className="rounded-lg border-l-2 border-zinc-300 pl-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            {detail.excerpt}
          </blockquote>
        ) : (
          <p className="text-xs text-zinc-500">No text excerpt.</p>
        )}
        <p className="mt-2 text-[11px] text-zinc-500">
          Excerpt only — full bodies are never shown or edited from the console.
        </p>
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
          </dl>
        ) : (
          <p className="text-xs text-zinc-500">Owner account no longer exists.</p>
        )}
      </Section>

      <Section title="Moderation history">
        {detail.history.length ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {detail.history.map((h) => (
              <li key={h.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{h.action}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(h.timestamp)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No moderation actions recorded for this item.</p>
        )}
      </Section>
    </div>
  );
}
