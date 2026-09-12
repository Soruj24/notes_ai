import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/src/lib/auth/config";
import { checkRateLimit, peekRateLimit, resetRateLimit } from "@/src/lib/rate-limit/limit";
import { authenticateUser } from "@/src/services/auth.service";
import { validateLogin } from "@/src/lib/auth/validation";

/** POST /api/auth/login — generic errors to avoid user enumeration. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { errors: { form: ["Invalid request body."] } },
      { status: 400 },
    );
  }

  const result = validateLogin(body as Record<string, unknown>);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const { email, password } = result.data;

  // Pre-auth gate: this route never sees requireApiUser, so maintenance
  // auth-freeze is enforced here (not inherited from anywhere).
  const { getMaintenanceState } = await import("@/src/lib/settings/state");
  const maintenance = await getMaintenanceState();
  if (maintenance.enabled && !maintenance.allowAuthentication) {
    return NextResponse.json(
      { errors: { form: [maintenance.message || "Scheduled maintenance. Please try again later."] } },
      { status: 503 },
    );
  }

  const { getSettingValue } = await import("@/src/lib/settings/state");
  const [maxAttempts, windowMinutes] = await Promise.all([
    getSettingValue("ratelimit.loginMaxAttempts", 5),
    getSettingValue("ratelimit.loginWindowMinutes", 10),
  ]);
  const throttle = { key: `login:${email}`, limit: maxAttempts, windowMs: windowMinutes * 60 * 1000 };
  const { logSecurityEvent, countRecentFailures, BRUTE_FORCE_THRESHOLD, BRUTE_FORCE_WINDOW_MIN } =
    await import("@/src/services/security.service");
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const userAgent = req.headers.get("user-agent")?.slice(0, 512) || undefined;
  if (peekRateLimit(throttle.key, throttle.windowMs).count >= throttle.limit) {
    await logSecurityEvent({
      type: "rate.limited",
      email,
      ipAddress,
      userAgent,
      metadata: { endpoint: "login" },
    });
    return NextResponse.json(
      { errors: { form: ["Too many attempts. Try again in a few minutes."] } },
      { status: 429 },
    );
  }

  try {
    const auth = await authenticateUser(email, password);
    if (!auth) {
      await checkRateLimit(throttle);
      await logSecurityEvent({ type: "login.failed", email, ipAddress, userAgent });
      // Brute-force tripwire: repeated failures → suspicious + critical alert.
      const failures = await countRecentFailures(
        email,
        new Date(Date.now() - BRUTE_FORCE_WINDOW_MIN * 60 * 1000),
      );
      if (failures >= BRUTE_FORCE_THRESHOLD) {
        await logSecurityEvent({
          type: "suspicious.activity",
          email,
          ipAddress,
          userAgent,
          severity: "CRITICAL",
          metadata: { reason: "repeated login failures", failures, windowMin: BRUTE_FORCE_WINDOW_MIN },
        });
      }
      return NextResponse.json(
        { errors: { form: ["Invalid email or password."] } },
        { status: 401 },
      );
    }
    resetRateLimit(throttle.key);
    await logSecurityEvent({ type: "login.succeeded", userId: auth.user.id, email, ipAddress, userAgent });
    const res = NextResponse.json({
      user: { id: auth.user.id, name: auth.user.name, email: auth.user.email },
    });
    res.cookies.set(SESSION_COOKIE, auth.token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("login failed", err);
    return NextResponse.json(
      { errors: { form: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
