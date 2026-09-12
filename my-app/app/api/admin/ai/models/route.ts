import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getModelCatalog } from "@/src/services/admin/ai.service";

/** GET /api/admin/ai/models — discovered + configured catalog (no secrets). */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getModelCatalog());
  } catch (err) {
    return toApiError(err);
  }
}
