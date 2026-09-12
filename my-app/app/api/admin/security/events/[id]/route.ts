import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getSecurityEventDetail } from "@/src/services/admin/security.service";

/** GET /api/admin/security/events/:id — full entry (sanitized metadata). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "security.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    const entry = await getSecurityEventDetail(id);
    if (!entry) {
      return NextResponse.json({ error: "Security event not found." }, { status: 404 });
    }
    return NextResponse.json({ event: entry });
  } catch (err) {
    return toApiError(err);
  }
}
