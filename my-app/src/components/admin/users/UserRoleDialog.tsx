"use client";

import { useState } from "react";
import { PLATFORM_ROLES, type PlatformRole } from "@/src/lib/rbac/roles";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Select } from "@/src/components/ui/select";
import type { AdminUser } from "./types";

/** Role change dialog with before/after summary. Grant guards enforced server-side. */
export function UserRoleDialog({
  user,
  actorRole,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  actorRole: PlatformRole | null;
  onClose: () => void;
  onConfirm: (role: PlatformRole | null) => Promise<void>;
}) {
  const [role, setRole] = useState<string>(user.role ?? "none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next: PlatformRole | null = role === "none" ? null : (role as PlatformRole);
  const unchanged = (user.role ?? null) === next;

  async function submit() {
    if (pending || unchanged) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(next);
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
      title="Change platform role"
      description={`${user.name} · ${user.email}`}
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={submit} disabled={pending || unchanged}>
            {pending ? "Working…" : "Change role"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Select
          id="user-role-select"
          label="Platform role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={pending}
          hint="Roles you may not grant are rejected server-side."
        >
          <option value="none">No role (regular user)</option>
          {PLATFORM_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <p className="text-xs text-zinc-500">
          {user.role ?? "No role"} → {next ?? "No role"}
          {actorRole ? ` · acting as ${actorRole}` : ""}
        </p>
        {next === "SUPER_ADMIN" ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            SUPER_ADMIN is a wildcard grant. Only promote accounts you fully trust.
          </p>
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
