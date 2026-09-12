import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { toApiError } from "@/src/lib/api/request";
import { parseAuditListQuery } from "@/src/lib/validation/audit";
import { listAuditEvents } from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";
import { recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";

const EXPORT_CAP = 5000;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/audit-logs/export?... — CSV download of the filtered
 * trail (capped). Requires audit.export. The export itself is audited
 * (AUDIT_EXPORTED) for transparency.
 */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "audit.export");
  if (staff instanceof NextResponse) return staff;
  try {
    const params = new URL(req.url).searchParams;
    const query = { ...parseAuditListQuery(params), limit: EXPORT_CAP, offset: 0 };
    const entries = await listAuditEvents(query);
    const actorIds = [...new Set(entries.map((e) => e.actorId))];
    const actors = await Promise.all(actorIds.map((id) => findUserById(id).catch(() => null)));
    const emails = new Map(actors.filter((a) => a).map((a) => [a!.id, a!.email]));

    const header = ["timestamp", "admin_email", "actor_role", "action", "resource", "resource_id", "result", "ip", "user_agent"];
    const lines = entries.map((e) =>
      [
        e.timestamp.toISOString(),
        emails.get(e.actorId) ?? e.actorId,
        e.actorRole ?? "",
        e.action,
        e.resourceType ?? "",
        e.resourceId ?? "",
        e.result,
        e.ipAddress ?? "",
        e.userAgent ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
    await recordAuditEvent({
      actorId: staff.user.id,
      actorRole: staff.role,
      action: "AUDIT_EXPORTED",
      resourceType: "audit",
      metadata: { exported: entries.length },
      ipAddress: getRequestContext(req).ipAddress,
      userAgent: getRequestContext(req).userAgent,
    });
    return new Response([header.map(csvCell).join(","), ...lines].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return toApiError(err);
  }
}
