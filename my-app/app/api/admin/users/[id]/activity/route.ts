import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getUserActivity } from "@/src/services/admin/users.service";

/** GET /api/admin/users/:id/activity — workspace trail + audit entries. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json(await getUserActivity(id));
  } catch (err) {
    return toApiError(err);
  }
}
