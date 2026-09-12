import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/src/lib/auth/config";
import { getSessionTokenFromRequest } from "@/src/lib/auth/cookies";
import { changePassword, getSessionUser } from "@/src/services/auth.service";
import { validatePasswordChange } from "@/src/lib/auth/validation";

/**
 * POST /api/auth/change-password — verify current, set new, revoke all other
 * sessions, and re-issue the current one so this device stays signed in.
 */
export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { errors: { form: ["Invalid request body."] } },
      { status: 400 },
    );
  }
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const [minLength, maxLength] = await Promise.all([
    getSettingValue("auth.passwordMinLength", 8),
    getSettingValue("security.passwordMaxLength", 128),
  ]);
  const result = validatePasswordChange(body as Record<string, unknown>, {
    minLength,
    maxLength,
  });
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  try {
    const changed = await changePassword(
      user.id,
      result.data.currentPassword,
      result.data.newPassword,
    );
    if ("error" in changed) {
      return NextResponse.json(
        { errors: { currentPassword: ["Current password is incorrect."] } },
        { status: 401 },
      );
    }
    const { logSecurityEvent } = await import("@/src/services/security.service");
    await logSecurityEvent({
      type: "password.changed",
      userId: user.id,
      email: user.email,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent")?.slice(0, 512) || undefined,
      metadata: { sessionsRevoked: true },
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, changed.token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("password change failed", err);
    return NextResponse.json(
      { errors: { form: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
