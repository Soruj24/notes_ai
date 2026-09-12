"use client";

import type { ReactNode } from "react";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PlatformRole,
} from "@/src/lib/rbac/roles";
import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Centralized client-side gating. Display-only: every sensitive API and
 * admin page re-verifies server-side (`src/lib/api/admin.ts`,
 * `src/lib/rbac/guard.ts`). Components must never hardcode role checks —
 * resolve everything through these helpers against the shared catalog.
 *
 * The `role` always flows from the server (layout prop / `/api/auth/me`),
 * never from client state.
 */

export function usePermissions(role: PlatformRole | null | undefined) {
  return {
    role: role ?? null,
    can: (permission: Permission): boolean => hasPermission(role, permission),
    canAll: (permissions: readonly Permission[]): boolean =>
      hasAllPermissions(role, permissions),
    canAny: (permissions: readonly Permission[]): boolean =>
      hasAnyPermission(role, permissions),
  };
}

interface CanProps {
  role: PlatformRole | null | undefined;
  /** Single permission or list (with `mode`). */
  permission: Permission | readonly Permission[];
  mode?: "all" | "any";
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ role, permission, mode = "all", fallback = null, children }: CanProps) {
  const perms = Array.isArray(permission) ? permission : [permission];
  const ok =
    perms.length === 1
      ? hasPermission(role, perms[0] as Permission)
      : mode === "any"
        ? hasAnyPermission(role, perms)
        : hasAllPermissions(role, perms);
  return ok ? <>{children}</> : <>{fallback}</>;
}
