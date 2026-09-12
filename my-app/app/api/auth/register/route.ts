import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/src/lib/auth/config";
import { isUniqueViolation } from "@/src/lib/db/errors";
import { registerUser } from "@/src/services/auth.service";
import { validateRegister } from "@/src/lib/auth/validation";

/** POST /api/auth/register — create account + start session. */
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

  const { getSettingValue, getMaintenanceState } = await import("@/src/lib/settings/state");
  const maintenance = await getMaintenanceState();
  if (maintenance.enabled && !maintenance.allowAuthentication) {
    return NextResponse.json(
      { errors: { form: [maintenance.message || "Scheduled maintenance. Please try again later."] } },
      { status: 503 },
    );
  }
  if (!(await getSettingValue("auth.registration", true))) {
    return NextResponse.json(
      { errors: { form: ["Registration is currently disabled."] } },
      { status: 403 },
    );
  }
  const [minLength, maxLength] = await Promise.all([
    getSettingValue("auth.passwordMinLength", 8),
    getSettingValue("security.passwordMaxLength", 128),
  ]);
  const result = validateRegister(body as Record<string, unknown>, {
    minLength,
    maxLength,
  });
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  try {
    const { user, token } = await registerUser(result.data);
    const { notifyAdmin } = await import("@/src/services/admin-notifications.service");
    void notifyAdmin({
      title: `New user registered: ${user.email}`,
      body: `${user.name} (${user.email}) created an account.`,
      severity: "info",
      priority: "low",
      source: "auth",
      linkHref: "/admin/users",
    });
    const res = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { errors: { email: ["An account with this email already exists."] } },
        { status: 409 },
      );
    }
    console.error("register failed", err);
    return NextResponse.json(
      { errors: { form: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
