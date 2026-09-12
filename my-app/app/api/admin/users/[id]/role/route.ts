import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { validatePlatformRole } from "@/src/lib/validation/users";
import { changeUserRole } from "@/src/services/admin/users.service";

/**
 * POST /api/admin/users/:id/role { role: PlatformRole | null }
 * Grant rules (canGrantRole) plus self/last-superadmin guards live in
 * the service — the route gate is only the first check.
 */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.update");
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { role, errors } = validatePlatformRole(
    parsed.body.role === undefined ? "invalid" : parsed.body.role,
  );
  if (errors) return NextResponse.json({ errors }, { status: 400 });
  try {
    const { id } = await ctx.params;
    const user = await changeUserRole(staff, id, role ?? null, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}
