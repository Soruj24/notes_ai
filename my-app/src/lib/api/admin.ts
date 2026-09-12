import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/api/request";
import type { CurrentUser } from "@/src/lib/auth/session";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PlatformRole,
} from "@/src/lib/rbac/roles";
import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Server-side authorization for `/api/admin/*` (and any sensitive route).
 * Mirrors `requireApiUser()` then enforces platform permissions against the
 * role read fresh from the database — never trust client-supplied roles.
 *
 * Returns `{ user }` on success or a `NextResponse` (401/403) on failure,
 * so handlers keep the existing `if (x instanceof NextResponse) return x`
 * pattern. The 403 body is deliberately generic to avoid leaking which
 * permission was missing.
 */

export interface PlatformUser {
  user: CurrentUser;
  role: PlatformRole;
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
}

/**
 * Best-effort denial record (ADMIN_ACCESS_DENIED, result=denied). Never
 * breaks the 403 response — the denial is logged when possible, the
 * rejection always stands.
 */
async function logDeniedAccess(req: Request, user: CurrentUser): Promise<void> {
  try {
    const { recordAuditEvent } = await import(
      "@/src/repositories/admin-audit-log.repository"
    );
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // Works for both /api/admin/<resource> and /api/v1/admin/<resource>.
    const adminIdx = parts.lastIndexOf("admin");
    const resource = adminIdx >= 0 ? parts[adminIdx + 1] : parts[2];
    const candidate = adminIdx >= 0 ? parts[adminIdx + 2] : parts[3];
    const resourceId = candidate && candidate.length <= 64 ? candidate : undefined;
    await recordAuditEvent({
      actorId: user.id,
      actorRole: user.role ?? undefined,
      action: "ADMIN_ACCESS_DENIED",
      resourceType: resource,
      resourceId,
      metadata: { path: url.pathname },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) || undefined,
      result: "denied",
    });
  } catch {
    // Denial stands regardless of logging.
  }
}

async function forbid(req: Request, user: CurrentUser): Promise<NextResponse> {
  await logDeniedAccess(req, user);
  // Mirror denials into the security stream (same BEST-effort contract).
  try {
    const { logSecurityEvent } = await import("@/src/services/security.service");
    await logSecurityEvent({
      type: "permission.denied",
      userId: user.id,
      email: user.email,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) || undefined,
      metadata: { path: new URL(req.url).pathname },
    });
  } catch {
    // Denial stands regardless of logging.
  }
  return forbidden();
}

/** Authenticated + holds ANY platform role (i.e. is staff of any kind). */
export async function requirePlatformUser(
  req: Request,
): Promise<PlatformUser | NextResponse> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  if (!user.role) return forbid(req, user);
  return { user, role: user.role };
}

/** Authenticated + holds a specific permission. */
export async function requirePermission(
  req: Request,
  permission: Permission,
): Promise<PlatformUser | NextResponse> {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  if (!hasPermission(staff.role, permission)) return forbid(req, staff.user);
  return staff;
}

/** Authenticated + holds ALL of the given permissions. */
export async function requireAllPermissions(
  req: Request,
  permissions: readonly Permission[],
): Promise<PlatformUser | NextResponse> {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  if (!hasAllPermissions(staff.role, permissions)) return forbid(req, staff.user);
  return staff;
}

/** Authenticated + holds ANY of the given permissions. */
export async function requireAnyPermission(
  req: Request,
  permissions: readonly Permission[],
): Promise<PlatformUser | NextResponse> {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  if (!hasAnyPermission(staff.role, permissions)) return forbid(req, staff.user);
  return staff;
}

export interface RateLimitSpec {
  /** Namespaced inside the authorizer (`admin:<label>:<userId>`). */
  label: string;
  limit: number;
  windowMs: number;
}

export interface AuthorizeOptions {
  permission?: Permission | readonly Permission[];
  mode?: "all" | "any";
  /** Sensitive endpoints: counted per actor, 429 + Retry-After on excess. */
  rateLimit?: RateLimitSpec;
}

/**
 * Centralized admin middleware. Every /api/v1/admin handler authorizes
 * through here, verifying in order:
 * 1. authenticated user (401; active account enforced by session lookup),
 * 2. admin role present (403),
 * 3. required permission(s) against the DB-read role (403),
 * 4. per-actor rate limit for sensitive endpoints (429).
 * Resource/target authorization (rank, scope, guards) lives in services —
 * this gate never trusts frontend roles, body roles, or URL ids.
 */
export async function authorizeAdmin(
  req: Request,
  opts: AuthorizeOptions = {},
): Promise<PlatformUser | NextResponse> {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  if (!user.role) return forbid(req, user);
  const staff: PlatformUser = { user, role: user.role };

  if (opts.permission) {
    const perms = Array.isArray(opts.permission) ? opts.permission : [opts.permission];
    const ok =
      perms.length === 1
        ? hasPermission(staff.role, perms[0] as Permission)
        : opts.mode === "any"
          ? hasAnyPermission(staff.role, perms)
          : hasAllPermissions(staff.role, perms);
    if (!ok) return forbid(req, staff.user);
  }

  if (opts.rateLimit) {
    const { checkRateLimit } = await import("@/src/lib/rate-limit/limit");
    const decision = await checkRateLimit({
      key: `admin:${opts.rateLimit.label}:${user.id}`,
      limit: opts.rateLimit.limit,
      windowMs: opts.rateLimit.windowMs,
    });
    if (!decision.allowed) {
      try {
        const { logSecurityEvent } = await import("@/src/services/security.service");
        await logSecurityEvent({
          type: "rate.limited",
          userId: user.id,
          email: user.email,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
          userAgent: req.headers.get("user-agent")?.slice(0, 512) || undefined,
          metadata: { endpoint: opts.rateLimit.label },
        });
      } catch {
        // Rate-limit stands regardless of logging.
      }
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(decision.resetMs / 1000)) },
        },
      );
    }
  }

  return staff;
}

type AdminHandler = (
  req: Request,
  ctx: { staff: PlatformUser; params: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Permission middleware wrapper for route handlers. Usage:
 *
 *   export const GET = withPermission("users.view", async (req, { staff }) => {
 *     ...
 *   });
 *
 * Authorization runs before the handler body — the handler cannot forget it.
 */
export function withPermission(
  permission: Permission | readonly Permission[],
  handler: AdminHandler,
  mode: "all" | "any" = "all",
) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const perms = Array.isArray(permission) ? permission : [permission];
    const staff =
      perms.length === 1
        ? await requirePermission(req, perms[0] as Permission)
        : mode === "any"
          ? await requireAnyPermission(req, perms)
          : await requireAllPermissions(req, perms);
    if (staff instanceof NextResponse) return staff;
    return handler(req, { staff, params: ctx.params });
  };
}
