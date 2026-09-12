import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getFeatures } from "@/src/services/admin/features.service";

/** GET /api/admin/features — flag catalog with state. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "features.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getFeatures());
  } catch (err) {
    return toApiError(err);
  }
}
