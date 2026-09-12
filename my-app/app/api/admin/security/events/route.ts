import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseSecurityListQuery } from "@/src/lib/validation/security";
import { getSecurityEvents } from "@/src/services/admin/security.service";

/** GET /api/admin/security/events — filterable, paginated event stream. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "security.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseSecurityListQuery(new URL(req.url).searchParams);
    return NextResponse.json(await getSecurityEvents(query));
  } catch (err) {
    return toApiError(err);
  }
}
