import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { toApiError } from "@/src/lib/api/request";
import { parseAuditListQuery } from "@/src/lib/validation/audit";
import {
  countAuditEvents,
  distinctAuditActions,
  distinctAuditActors,
  distinctAuditResourceTypes,
  getAuditEvent,
  listAuditEvents,
  recordAuditEvent,
} from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";

/** Audit trail controller (v1). Read-only except the self-audited export. */

export async function listEntries(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "audit.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseAuditListQuery(new URL(req.url).searchParams);
    const [entries, total] = await Promise.all([
      listAuditEvents(query),
      countAuditEvents(query),
    ]);
    const actorIds = [...new Set(entries.map((e) => e.actorId))];
    const actors = await Promise.all(actorIds.map((id) => findUserById(id).catch(() => null)));
    const actorById = new Map(actors.filter((a) => a).map((a) => [a!.id, { name: a!.name, email: a!.email }]));
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

export async function listFilterOptions(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "audit.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const [actions, resourceTypes, actors] = await Promise.all([
      distinctAuditActions(),
      distinctAuditResourceTypes(),
      distinctAuditActors(),
    ]);
    const resolved = await Promise.all(
      actors.map(async (a) => {
        const user = await findUserById(a.id).catch(() => null);
        return { id: a.id, name: user?.name ?? "(deleted user)", email: user?.email ?? "", role: a.lastRole };
      }),
    );
    return NextResponse.json({ actions, resourceTypes, actors: resolved });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getEntry(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "audit.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const doc = await getAuditEvent(id);
    if (!doc) return NextResponse.json({ error: "Audit entry not found." }, { status: 404 });
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

const EXPORT_CAP = 5000;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportEntries(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "audit.export", rateLimit: { label: "audit-export", limit: 10, windowMs: 60000 } });
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
