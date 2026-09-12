import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSecret } from "@/src/lib/auth/config";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/src/lib/auth/constants";
import { verifySessionToken } from "@/src/lib/auth/tokens";
import { getSessionUser } from "@/src/services/auth.service";
import type { PlatformRole } from "@/src/lib/rbac/roles";

/**
 * Server-side session helpers for pages, layouts, and route handlers.
 * Full verification = signature + expiry + MongoDB revocation check.
 * (Proxy performs the signature/expiry pre-check at the edge.)
 */

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** Platform role, read fresh from the DB per request. Null = no platform permissions. */
  role: PlatformRole | null;
  createdAt: number;
}

export async function verifyRequestSession(
  token: string | undefined,
): Promise<CurrentUser | null> {
  if (!token) return null;
  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return null;
  }
  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;
  const user = await getSessionUser(token);
  if (!user || user.id !== payload.sub) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.getTime(),
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  return verifyRequestSession(store.get(SESSION_COOKIE)?.value);
}

/** Page/layout guard. Redirects anonymous visitors to login, preserving target. */
export async function requireUser(nextPath = "/profile"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export { SESSION_COOKIE, SESSION_TTL_MS };
