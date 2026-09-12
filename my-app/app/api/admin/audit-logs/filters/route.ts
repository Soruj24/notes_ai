import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import {
  distinctAuditActions,
  distinctAuditActors,
  distinctAuditResourceTypes,
} from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";

/** GET /api/admin/audit-logs/filters — distinct actions, resources, actors. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "audit.view");
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
        return {
          id: a.id,
          name: user?.name ?? "(deleted user)",
          email: user?.email ?? "",
          role: a.lastRole,
        };
      }),
    );
    return NextResponse.json({ actions, resourceTypes, actors: resolved });
  } catch (err) {
    return toApiError(err);
  }
}
