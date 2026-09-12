import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import {
  validateStatusReason,
  validateWorkspaceStatus,
} from "@/src/lib/validation/workspaces";
import { changeWorkspaceStatus } from "@/src/services/admin/workspaces.service";

/**
 * POST /api/admin/workspaces/:id/status { status, reason? }
 * Suspend/archive/restore needs workspaces.suspend; delete/restore-from-
 * deleted needs workspaces.delete (re-checked in the service).
 */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requireAnyPermission(req, ["workspaces.suspend", "workspaces.delete"]);
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { status, errors: statusErrors } = validateWorkspaceStatus(parsed.body.status);
  if (statusErrors || !status) return NextResponse.json({ errors: statusErrors }, { status: 400 });
  const { reason, errors: reasonErrors } = validateStatusReason(parsed.body.reason);
  if (reasonErrors) return NextResponse.json({ errors: reasonErrors }, { status: 400 });
  try {
    const { id } = await ctx.params;
    const workspace = await changeWorkspaceStatus(staff, id, status, reason, getRequestContext(req));
    return NextResponse.json({ workspace });
  } catch (err) {
    return toApiError(err);
  }
}
