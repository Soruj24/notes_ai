import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseAnalyticsRange } from "@/src/lib/validation/analytics";
import { getAdminAnalytics } from "@/src/services/admin/analytics.service";

/** GET /api/admin/analytics?range=today|7d|30d|90d|custom&since=&until= */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "analytics.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const range = parseAnalyticsRange(new URL(req.url).searchParams);
    return NextResponse.json(await getAdminAnalytics(range));
  } catch (err) {
    return toApiError(err);
  }
}
