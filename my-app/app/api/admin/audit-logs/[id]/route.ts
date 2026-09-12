import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";

/** GET /api/admin/audit-logs/:id — full entry incl. metadata (inspect drawer). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "audit.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    const doc = await getAuditEvent(id);
    if (!doc) {
      return NextResponse.json({ error: "Audit entry not found." }, { status: 404 });
    }
    const actor = await findUserById(doc.actorId).catch(() => null);
    return NextResponse.json({
      entry: {
        ...doc,
        actorName: actor?.name ?? "(deleted user)",
        actorEmail: actor?.email ?? "",
        timestamp: doc.timestamp.toISOString(),
      },
    });
  } catch (err) {
    return toApiError(err);
  }
}
