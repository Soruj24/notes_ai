"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import type { AdminUser, StatusAction } from "./types";

const COPY: Record<StatusAction, { title: string; body: string; confirm: string; destructive: boolean; needsReason: boolean }> = {
  suspend: {
    title: "Suspend user",
    body: "The account is locked out immediately and all sessions are revoked. The record is kept for audit.",
    confirm: "Suspend account",
    destructive: false,
    needsReason: true,
  },
  unsuspend: {
    title: "Restore account",
    body: "The account returns to ACTIVE and can sign in again.",
    confirm: "Restore account",
    destructive: false,
    needsReason: false,
  },
  ban: {
    title: "Ban user",
    body: "The account is permanently blocked and all sessions are revoked. The record is kept for audit. Only a privileged restore can undo this.",
    confirm: "Ban account",
    destructive: true,
    needsReason: true,
  },
  delete: {
    title: "Delete user",
    body: "The account moves to DELETED: blocked from auth, sessions revoked, record retained for audit. Type the user's email below to confirm.",
    confirm: "Delete account",
    destructive: true,
    needsReason: true,
  },
};

/** Confirmation dialog for lifecycle transitions. Dangerous actions need reason; delete needs typed email. */
export function UserStatusDialog({
  user,
  action,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  action: StatusAction;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<void>;
}) {
  const copy = COPY[action];
  const [reason, setReason] = useState("");
  const [typedEmail, setTypedEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches = typedEmail.trim().toLowerCase() === user.email.toLowerCase();
  const canSubmit =
    !pending &&
    (!copy.needsReason || reason.trim().length > 0) &&
    (action !== "delete" || emailMatches);

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
      description={`${user.name} · ${user.email}`}
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
            id="user-status-reason"
            label="Reason (stored in the audit log)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Repeated ToS violations, ticket #1234"
            maxLength={500}
            disabled={pending}
          />
        ) : null}
        {action === "delete" ? (
          <Input
            id="user-status-confirm-email"
            label={`Type ${user.email} to confirm`}
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.target.value)}
            placeholder={user.email}
            autoComplete="off"
            disabled={pending}
            error={!emailMatches && typedEmail ? "Email does not match." : undefined}
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
