import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getRecentAdminActions } from "@/src/services/admin/security.service";

/** GET /api/admin/security/admin-actions — recent staff-attributed audit entries. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "security.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getRecentAdminActions());
  } catch (err) {
    return toApiError(err);
  }
}
