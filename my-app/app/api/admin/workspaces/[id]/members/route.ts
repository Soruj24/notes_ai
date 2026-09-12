import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getWorkspaceMembers } from "@/src/services/admin/workspaces.service";

/** GET /api/admin/workspaces/:id/members — roster with user profiles. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "workspaces.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ members: await getWorkspaceMembers(id) });
  } catch (err) {
    return toApiError(err);
  }
}
