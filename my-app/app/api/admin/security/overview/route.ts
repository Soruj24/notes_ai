import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getSecurityOverview } from "@/src/services/admin/security.service";

/** GET /api/admin/security/overview — category counts (sanitized shapes only). */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "security.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSecurityOverview());
  } catch (err) {
    return toApiError(err);
  }
}
