import { NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/src/lib/auth/cookies";
import { toHttpError } from "@/src/lib/db/errors";
import { verifyRequestSession, type CurrentUser } from "@/src/lib/auth/session";

/**
 * Shared route-handler plumbing: session resolution, JSON parsing,
 * and error mapping (domain errors + mongoose validation).
 */

export async function requireApiUser(
  req: Request,
): Promise<CurrentUser | NextResponse> {
  try {
    const user = await verifyRequestSession(getSessionTokenFromRequest(req));
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    // Maintenance mode: configured access rules (never hardcoded).
    const { getMaintenanceState, isApiAllowedDuringMaintenance } = await import(
      "@/src/lib/settings/state"
    );
    const pathname = new URL(req.url).pathname;
    const maintenance = await getMaintenanceState();
    if (!isApiAllowedDuringMaintenance(maintenance, pathname, user.role !== null)) {
      return NextResponse.json(
        { error: maintenance.message || "Scheduled maintenance. Please try again later." },
        { status: 503 },
      );
    }
    return user;
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function parseJsonBody(
  req: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | NextResponse> {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return { ok: true, body };
  } catch {
    return NextResponse.json(
      { errors: { form: ["Invalid request body."] } },
      { status: 400 },
    );
  }
}

function isMongooseValidationError(err: unknown): err is {
  errors: Record<string, { message: string }>;
} {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "ValidationError" &&
    "errors" in err
  );
}

export function toApiError(err: unknown): NextResponse {
  if (isMongooseValidationError(err)) {
    const fields: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(err.errors)) {
      fields[key] = [value.message];
    }
    return NextResponse.json({ errors: fields }, { status: 400 });
  }
  const mapped = toHttpError(err);
  return NextResponse.json(mapped.body, { status: mapped.status });
}
