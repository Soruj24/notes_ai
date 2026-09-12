import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseWorkspaceListQuery } from "@/src/lib/validation/workspaces";
import { getWorkspacesList } from "@/src/services/admin/workspaces.service";

/** GET /api/admin/workspaces?q=&status=&sort=&dir=&limit=&offset= */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "workspaces.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseWorkspaceListQuery(new URL(req.url).searchParams);
    return NextResponse.json(await getWorkspacesList(query));
  } catch (err) {
    return toApiError(err);
  }
}
