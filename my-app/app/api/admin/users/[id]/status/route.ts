import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { validateStatusReason, validateUserStatus } from "@/src/lib/validation/users";
import { changeUserStatus } from "@/src/services/admin/users.service";

/**
 * POST /api/admin/users/:id/status { status, reason? }
 * Suspend/unsuspend needs users.suspend; ban/delete/restore needs
 * users.delete (re-checked in the service per transition).
 */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requireAnyPermission(req, ["users.suspend", "users.delete"]);
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { status, errors: statusErrors } = validateUserStatus(parsed.body.status);
  if (statusErrors || !status) return NextResponse.json({ errors: statusErrors }, { status: 400 });
  const { reason, errors: reasonErrors } = validateStatusReason(parsed.body.reason);
  if (reasonErrors) return NextResponse.json({ errors: reasonErrors }, { status: 400 });
  try {
    const { id } = await ctx.params;
    const user = await changeUserStatus(staff, id, status, reason, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}
