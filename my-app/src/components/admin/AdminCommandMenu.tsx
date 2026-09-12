"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandMenu, type CommandItem } from "@/src/components/ui/command-menu";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";
import { usePermissions } from "@/src/components/auth/Can";
import { flattenAdminNav } from "@/src/components/admin/admin-nav";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";
import { ADMIN_SECTIONS } from "@/src/components/admin/admin-nav";

interface PaletteUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface PaletteWorkspace {
  id: string;
  name: string;
}

type Mode =
  | { name: "root" }
  | { name: "users" }
  | { name: "user"; user: PaletteUser }
  | { name: "workspaces" }
  | {
      name: "confirm";
      title: string;
      body: string;
      confirmLabel: string;
      destructive: boolean;
      back: Mode;
      run: () => Promise<string>;
    };

const SUSPEND_REASON = "Suspended from the admin command palette.";

/**
 * Console command palette (Ctrl/Cmd+K). Navigation, entity search, and
 * privileged actions — every entry is filtered by the caller's
 * permissions (never exposed otherwise), destructive actions confirm
 * inside the palette, and mutations audit server-side.
 */
export function AdminCommandMenu({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: PlatformRole | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { can } = usePermissions(role);
  const [mode, setMode] = useState<Mode>({ name: "root" });
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PaletteUser[]>([]);
  const [workspaces, setWorkspaces] = useState<PaletteWorkspace[]>([]);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canViewUsers = can("users.view");
  const canSuspend = can("users.suspend");
  const canDeleteUsers = can("users.delete");
  const canViewWorkspaces = can("workspaces.view");

  function reset() {
    setMode({ name: "root" });
    setQuery("");
    setUsers([]);
    setWorkspaces([]);
    setConfirmError(null);
    setConfirming(false);
  }

  function close() {
    reset();
    onClose();
  }

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, onClose],
  );

  function onQuery(q: string) {
    setQuery(q);
    // Clear stale results as the query shortens (event context, not effect).
    if (q.trim().length < 2) {
      setUsers([]);
      setWorkspaces([]);
    }
  }

  // Debounced entity search for users/workspaces modes.
  useEffect(() => {
    if (!open) return;
    if (mode.name !== "users" && mode.name !== "workspaces") return;
    const q = query.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      if (mode.name === "users" && canViewUsers) {
        fetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=6`, { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) return;
            const json = (await res.json()) as { users?: PaletteUser[] };
            setUsers(json.users ?? []);
          })
          .catch(() => undefined);
      } else if (mode.name === "workspaces" && canViewWorkspaces) {
        fetch(`/api/admin/workspaces?q=${encodeURIComponent(q)}&limit=6`, { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) return;
            const json = (await res.json()) as { workspaces?: PaletteWorkspace[] };
            setWorkspaces(json.workspaces ?? []);
          })
          .catch(() => undefined);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, mode, query, canViewUsers, canViewWorkspaces]);

  // Fresh mount per open (see AdminShell) — no reset effect needed.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Escape backs out of sub-modes before closing (CommandMenu closes the
  // input itself; mode-level back lives here in the capture phase).
  useEffect(() => {
    if (!open || mode.name === "root") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (mode.name === "user") setMode({ name: "users" });
        else if (mode.name === "users" || mode.name === "workspaces") setMode({ name: "root" });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, mode.name]);

  if (!open) return null;

  // --- confirm mode: dedicated panel (destructive actions) ---
  if (mode.name === "confirm") {
    const current = mode;
    async function confirm() {
      if (confirming) return;
      setConfirming(true);
      setConfirmError(null);
      try {
        const message = await current.run();
        toast(message, { tone: "success" });
        close();
      } catch (err) {
        setConfirmError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setConfirming(false);
      }
    }
    function back() {
      setConfirmError(null);
      setConfirming(false);
      setMode(current.back);
    }
    return (
      <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
        <button type="button" aria-label="Close command menu" onClick={close} className="absolute inset-0 cursor-default bg-black/40" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="text-sm font-semibold tracking-tight">{current.title}</h2>
          <p className="mt-1.5 text-sm text-zinc-500">{current.body}</p>
          {confirmError ? (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {confirmError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={back} disabled={confirming}>
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              variant={current.destructive ? "destructive" : "primary"}
              onClick={confirm}
              disabled={confirming}
            >
              {confirming ? "Working…" : current.confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- item assembly per mode ---
  const items: CommandItem[] = [];
  let placeholder = "Type a command or search…";

  if (mode.name === "root") {
    for (const item of flattenAdminNav(filterNavSections(ADMIN_SECTIONS, role))) {
      items.push({ id: `go:${item.href}`, label: `Go to ${item.label}`, group: "Navigate" });
    }
    if (canViewUsers) {
      items.push({ id: "mode:users", label: "Search users…", hint: "open · suspend", group: "Users" });
    }
    if (canViewWorkspaces) {
      items.push({ id: "mode:workspaces", label: "Open workspace…", hint: "search", group: "Workspaces" });
    }
    if (can("audit.view")) {
      items.push({ id: "nav:/admin/audit-logs", label: "Search audit logs", group: "Navigate" });
    }
    if (can("ai.view")) {
      items.push({ id: "nav:/admin/ai", label: "Open AI settings", group: "Navigate" });
    }
    if (can("features.view")) {
      items.push({ id: "nav:/admin/features", label: "Open feature flags", group: "Navigate" });
    }
    if (can("system.view")) {
      items.push({ id: "nav:/admin/system", label: "Open system health", group: "Navigate" });
    }
    if (can("security.view")) {
      items.push({ id: "nav:/admin/security", label: "Open security center", group: "Navigate" });
    }
  } else if (mode.name === "users") {
    placeholder = "Search users by name or email… (Esc to go back)";
    for (const u of users) {
      items.push({
        id: `user:${u.id}`,
        label: u.name,
        hint: `${u.email} · ${u.status}`,
        keywords: u.email,
        group: "Users",
      });
    }
    items.push({ id: "mode:root", label: "Back to commands", group: "Navigate" });
  } else if (mode.name === "user") {
    const u = mode.user;
    placeholder = `${u.name} · ${u.email}`;
    items.push({
      id: `open-user:${u.id}`,
      label: `Open ${u.name} in Users`,
      hint: u.email,
      group: "User",
    });
    const canAct = u.status === "ACTIVE" ? canSuspend : canSuspend || canDeleteUsers;
    if (canAct && u.status === "ACTIVE") {
      items.push({ id: `suspend-user:${u.id}`, label: `Suspend ${u.name}…`, hint: "destructive · confirm", group: "User" });
    }
    if (canAct && u.status !== "ACTIVE") {
      items.push({ id: `unsuspend-user:${u.id}`, label: `Unsuspend ${u.name}`, hint: "restore access", group: "User" });
    }
    items.push({ id: "mode:users", label: "Back to user search", group: "Navigate" });
  } else if (mode.name === "workspaces") {
    placeholder = "Search workspaces by name… (Esc to go back)";
    for (const w of workspaces) {
      items.push({ id: `workspace:${w.id}`, label: w.name, hint: "open in Workspaces", group: "Workspaces" });
    }
    items.push({ id: "mode:root", label: "Back to commands", group: "Navigate" });
  }

  async function select(id: string) {
    if (id.startsWith("go:")) {
      go(id.slice(3));
      return;
    }
    if (id.startsWith("nav:")) {
      go(id.slice(4));
      return;
    }
    if (id === "mode:root") {
      setQuery("");
      setMode({ name: "root" });
      return;
    }
    if (id === "mode:users") {
      setUsers([]);
      setQuery("");
      setMode({ name: "users" });
      return;
    }
    if (id === "mode:workspaces") {
      setWorkspaces([]);
      setQuery("");
      setMode({ name: "workspaces" });
      return;
    }
    if (id.startsWith("user:")) {
      const found = users.find((u) => u.id === id.slice(5));
      if (found) {
        setQuery("");
        setMode({ name: "user", user: found });
      }
      return;
    }
    if (id.startsWith("open-user:")) {
      const current = mode;
      if (current.name !== "user") return;
      go(`/admin/users?q=${encodeURIComponent(current.user.email)}`);
      return;
    }
    if (id.startsWith("workspace:")) {
      const found = workspaces.find((w) => w.id === id.slice(10));
      if (found) go(`/admin/workspaces?q=${encodeURIComponent(found.name)}`);
      return;
    }
    if (id.startsWith("suspend-user:") || id.startsWith("unsuspend-user:")) {
      const suspending = id.startsWith("suspend-user:");
      const current = mode;
      if (current.name !== "user") return;
      const target = current.user;
      if (!suspending) {
        // Restore is reversible: execute directly with feedback.
        try {
          const res = await fetch(`/api/admin/users/${target.id}/status`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE" }),
          });
          const json = (await res.json().catch(() => null)) as { error?: string };
          if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
          toast(`${target.name} restored.`, { tone: "success" });
          close();
        } catch (err) {
          toast(err instanceof Error ? err.message : "Something went wrong.", { tone: "danger" });
        }
        return;
      }
      const back: Mode = { name: "user", user: target };
      setMode({
        name: "confirm",
        title: `Suspend ${target.name}?`,
        body: `The account (${target.email}) is locked out immediately and all sessions are revoked. Reason recorded: “${SUSPEND_REASON}”`,
        confirmLabel: "Suspend account",
        destructive: true,
        back,
        run: async () => {
          const res = await fetch(`/api/admin/users/${target.id}/status`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "SUSPENDED", reason: SUSPEND_REASON }),
          });
          const json = (await res.json().catch(() => null)) as { error?: string; errors?: unknown };
          if (!res.ok) {
            const first =
              json && typeof json === "object" && json.errors && typeof json.errors === "object"
                ? Object.values(json.errors as Record<string, unknown>)
                    .flat()
                    .find((v): v is string => typeof v === "string")
                : undefined;
            throw new Error(json?.error ?? first ?? `Request failed (${res.status}).`);
          }
          return `${target.name} suspended.`;
        },
      });
    }
  }

  return (
    <CommandMenu
      key={mode.name}
      open
      onClose={close}
      items={items}
      onSelect={select}
      onQueryChange={onQuery}
      placeholder={placeholder}
      label="Admin command palette"
    />
  );
}
