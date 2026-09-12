import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearCookieOptions } from "@/src/lib/auth/config";
import { getSessionTokenFromRequest } from "@/src/lib/auth/cookies";
import { revokeSession } from "@/src/services/auth.service";

/** POST /api/auth/logout — revoke session + clear cookie (idempotent). */
export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (token) {
    try {
      const { getSessionUser } = await import("@/src/services/auth.service");
      const user = await getSessionUser(token).catch(() => null);
      await revokeSession(token);
      if (user) {
        const { logSecurityEvent } = await import("@/src/services/security.service");
        await logSecurityEvent({
          type: "session.revoked",
          userId: user.id,
          email: user.email,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
          userAgent: req.headers.get("user-agent")?.slice(0, 512) || undefined,
        });
      }
    } catch {
      // Revocation best-effort; cookie is cleared regardless.
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", clearCookieOptions());
  return res;
}
