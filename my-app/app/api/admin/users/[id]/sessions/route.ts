import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getUserSessions } from "@/src/services/admin/users.service";

/** GET /api/admin/users/:id/sessions — session summaries (no token hashes). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ sessions: await getUserSessions(id) });
  } catch (err) {
    return toApiError(err);
  }
}
