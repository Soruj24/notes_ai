import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { markRead } from "@/src/services/admin/notifications.service";

/** POST /api/admin/notifications/:id/read — acknowledge one item. */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "notifications.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json(await markRead(staff, id));
  } catch (err) {
    return toApiError(err);
  }
}
