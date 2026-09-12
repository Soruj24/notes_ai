"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import type { AdminWorkspace, WorkspaceStatusAction } from "./types";

const COPY: Record<
  WorkspaceStatusAction,
  { title: string; body: string; confirm: string; destructive: boolean; needsReason: boolean }
> = {
  suspend: {
    title: "Suspend workspace",
    body: "Members lose all access immediately — reads and writes are rejected by the service layer. The data is kept.",
    confirm: "Suspend workspace",
    destructive: false,
    needsReason: true,
  },
  unsuspend: {
    title: "Restore workspace",
    body: "The workspace returns to ACTIVE with full member access.",
    confirm: "Restore workspace",
    destructive: false,
    needsReason: false,
  },
  archive: {
    title: "Archive workspace",
    body: "Members keep read access, but every write is rejected by the service layer. Use for dormant workspaces.",
    confirm: "Archive workspace",
    destructive: false,
    needsReason: true,
  },
  delete: {
    title: "Delete workspace",
    body: "Members lose all access. The record is retained for audit — this cannot be undone from the console. Type the workspace name below to confirm.",
    confirm: "Delete workspace",
    destructive: true,
    needsReason: true,
  },
};

/** Confirmation dialog for lifecycle transitions. Delete needs typed name + reason. */
export function WorkspaceStatusDialog({
  workspace,
  action,
  onClose,
  onConfirm,
}: {
  workspace: AdminWorkspace;
  action: WorkspaceStatusAction;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<void>;
}) {
  const copy = COPY[action];
  const [reason, setReason] = useState("");
  const [typedName, setTypedName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameMatches = typedName.trim() === workspace.name;
  const canSubmit =
    !pending &&
    (!copy.needsReason || reason.trim().length > 0) &&
    (action !== "delete" || nameMatches);

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(copy.needsReason ? reason.trim() : undefined);
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
      title={copy.title}
      description={workspace.name}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={copy.destructive ? "destructive" : "primary"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {pending ? "Working…" : copy.confirm}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.body}</p>
        {copy.needsReason ? (
          <Input
            id="workspace-status-reason"
            label="Reason (stored in the audit log)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Abusive content, ticket #1234"
            maxLength={500}
            disabled={pending}
          />
        ) : null}
        {action === "delete" ? (
          <Input
            id="workspace-status-confirm-name"
            label={`Type ${workspace.name} to confirm`}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={workspace.name}
            autoComplete="off"
            disabled={pending}
            error={!nameMatches && typedName ? "Name does not match." : undefined}
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
