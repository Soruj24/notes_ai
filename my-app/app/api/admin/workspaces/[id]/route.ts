import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getWorkspaceDetail } from "@/src/services/admin/workspaces.service";

/** GET /api/admin/workspaces/:id — inspect (owner, status history). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "workspaces.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ workspace: await getWorkspaceDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}
