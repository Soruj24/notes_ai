import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getWorkspaceStatsDetail } from "@/src/services/admin/workspaces.service";

/** GET /api/admin/workspaces/:id/stats — members, content, storage, AI usage. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "workspaces.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ stats: await getWorkspaceStatsDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}
