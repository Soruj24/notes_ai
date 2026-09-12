"use client";

import { useState } from "react";
import { ENTITY_CONFIG, type ModAction, type ModEntity } from "@/src/lib/moderation";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import type { ModItem } from "./types";

/**
 * Destructive-action confirmation. Shows the consequence, requires a
 * reason (except restore), and requires typing the title for irreversible
 * destruction (hard delete / purge). Every confirmed action is audited.
 */
export function LifecycleDialog({
  entity,
  item,
  action,
  onClose,
  onConfirm,
}: {
  entity: ModEntity;
  item: ModItem;
  action: ModAction;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<void>;
}) {
  const config = ENTITY_CONFIG[entity];
  const irreversible = action === "delete" || action === "purge";
  const needsReason = action !== "restore";
  const [reason, setReason] = useState("");
  const [typedTitle, setTypedTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleMatches = typedTitle.trim() === item.title;
  const canSubmit =
    !pending && (!needsReason || reason.trim().length > 0) && (!irreversible || titleMatches);

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(needsReason ? reason.trim() : undefined);
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
      title={`${config.verbs[action]} ${config.singular}`}
      description={`${item.title} · ${item.workspaceName}`}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={irreversible ? "destructive" : "primary"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {pending ? "Working…" : `${config.verbs[action]} ${config.singular}`}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{config.consequences[action]}</p>
        {needsReason ? (
          <Input
            id="lifecycle-reason"
            label="Reason (stored in the audit log)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Spam content, ticket #1234"
            maxLength={500}
            disabled={pending}
          />
        ) : null}
        {irreversible ? (
          <Input
            id="lifecycle-confirm-title"
            label={`Type “${item.title}” to confirm`}
            value={typedTitle}
            onChange={(e) => setTypedTitle(e.target.value)}
            placeholder={item.title}
            autoComplete="off"
            disabled={pending}
            error={!titleMatches && typedTitle ? "Title does not match." : undefined}
          />
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
