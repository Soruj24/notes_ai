import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getUserMemberships } from "@/src/services/admin/users.service";

/** GET /api/admin/users/:id/memberships — workspaces with names and roles. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ memberships: await getUserMemberships(id) });
  } catch (err) {
    return toApiError(err);
  }
}
