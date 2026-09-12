import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getProviders } from "@/src/services/admin/ai.service";

/** GET /api/admin/ai/providers — reachability, models, key presence (never the key). */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getProviders());
  } catch (err) {
    return toApiError(err);
  }
}
