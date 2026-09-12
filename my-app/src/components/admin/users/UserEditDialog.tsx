"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import type { AdminUser } from "./types";

/** Edit display name. Email is identity and stays read-only. */
export function UserEditDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = !pending && trimmed.length > 0 && trimmed.length <= 64 && trimmed !== user.name;

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(trimmed);
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
      title="Edit user"
      description={user.email}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={submit} disabled={!canSubmit}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <Input
        id="user-edit-name"
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={64}
        disabled={pending}
        error={trimmed.length > 64 ? "Name must be 64 characters or fewer." : undefined}
      />
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
