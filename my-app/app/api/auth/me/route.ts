import { NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/src/lib/auth/cookies";
import { getSessionUser, renameUser } from "@/src/services/auth.service";
import { validateProfileUpdate } from "@/src/lib/auth/validation";
import type { PlatformRole } from "@/src/lib/rbac/roles";

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: PlatformRole | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // Role is display-only for UI gating; enforcement is always server-side.
    role: user.role,
    createdAt: user.createdAt.getTime(),
  };
}

/** GET /api/auth/me — current session user. */
export async function GET(req: Request) {
  const token = getSessionTokenFromRequest(req);
  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json({ user: toPublicUser(user) });
}

/** PATCH /api/auth/me — update display name. */
export async function PATCH(req: Request) {
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
  const result = validateProfileUpdate(body as Record<string, unknown>);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const updated = await renameUser(user.id, result.data.name);
  if (!updated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json({ user: toPublicUser(updated) });
}
