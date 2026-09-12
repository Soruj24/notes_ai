import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getAIOverview } from "@/src/services/admin/ai.service";

/** GET /api/admin/ai/overview — status rollup (no secrets). */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAIOverview());
  } catch (err) {
    return toApiError(err);
  }
}
