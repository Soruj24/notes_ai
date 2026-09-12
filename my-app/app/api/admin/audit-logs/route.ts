import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseAuditListQuery } from "@/src/lib/validation/audit";
import {
  countAuditEvents,
  listAuditEvents,
} from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";

/** GET /api/admin/audit-logs — filterable, paginated audit trail + actor emails. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "audit.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseAuditListQuery(new URL(req.url).searchParams);
    const [entries, total] = await Promise.all([
      listAuditEvents(query),
      countAuditEvents(query),
    ]);
    // Batch actor resolution (names for the admin column).
    const actorIds = [...new Set(entries.map((e) => e.actorId))];
    const actors = await Promise.all(
      actorIds.map((id) => findUserById(id).catch(() => null)),
    );
    const actorById = new Map(
      actors.filter((a) => a).map((a) => [a!.id, { name: a!.name, email: a!.email }]),
    );
    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        actorId: e.actorId,
        actorName: actorById.get(e.actorId)?.name ?? "(deleted user)",
        actorEmail: actorById.get(e.actorId)?.email ?? "",
        actorRole: e.actorRole,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        workspaceId: e.workspaceId,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        result: e.result,
        timestamp: e.timestamp.toISOString(),
      })),
      total,
    });
  } catch (err) {
    return toApiError(err);
  }
}
