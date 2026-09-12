import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseAnalyticsRange } from "@/src/lib/validation/analytics";
import { getAdminAnalytics } from "@/src/services/admin/analytics.service";

/** Platform analytics controller (v1). */

export async function getAnalytics(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "analytics.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const range = parseAnalyticsRange(new URL(req.url).searchParams);
    return NextResponse.json(await getAdminAnalytics(range));
  } catch (err) {
    return toApiError(err);
  }
}
