import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { toApiError } from "@/src/lib/api/request";
import { revokeUserSessions } from "@/src/services/admin/users.service";

/**
 * POST /api/admin/users/:id/sessions/revoke — sign the user out everywhere.
 * Safe account action: users.view suffices (Support included); audited.
 */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json(await revokeUserSessions(staff, id, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}
