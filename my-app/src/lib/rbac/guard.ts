import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/src/lib/auth/session";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PlatformRole,
} from "@/src/lib/rbac/roles";
import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Server-side route protection for admin pages/layouts. The edge proxy
 * cannot check platform roles (no DB at the edge), so admin routes are
 * gated here — same split of responsibilities as `requireUser()`.
 *
 * Unauthenticated → /login?next=. Authenticated but unauthorized →
 * /dashboard (a safe signed-in landing; never leaks admin existence).
 * Client-side gating (`Can`) is display-only and must never replace this.
 */

export async function requirePlatformRole(
  roles: readonly PlatformRole[],
  nextPath = "/admin",
): Promise<CurrentUser & { role: PlatformRole }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!user.role || !roles.includes(user.role)) redirect("/dashboard");
  return user as CurrentUser & { role: PlatformRole };
}

export async function requirePagePermission(
  permission: Permission,
  nextPath = "/admin",
): Promise<CurrentUser & { role: PlatformRole }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!user.role || !hasPermission(user.role, permission)) redirect("/dashboard");
  return user as CurrentUser & { role: PlatformRole };
}

export async function requirePagePermissions(
  permissions: readonly Permission[],
  nextPath = "/admin",
  mode: "all" | "any" = "all",
): Promise<CurrentUser & { role: PlatformRole }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const ok =
    user.role &&
    (mode === "any"
      ? hasAnyPermission(user.role, permissions)
      : hasAllPermissions(user.role, permissions));
  if (!ok) redirect("/dashboard");
  return user as CurrentUser & { role: PlatformRole };
}
