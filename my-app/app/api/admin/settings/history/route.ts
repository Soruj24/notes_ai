import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getSettingsHistory } from "@/src/services/admin/settings.service";

/** GET /api/admin/settings/history — settings change trail. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "settings.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSettingsHistory());
  } catch (err) {
    return toApiError(err);
  }
}
