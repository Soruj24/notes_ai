import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import {
  parseWorkspaceListQuery,
  validateStatusReason,
  validateWorkspaceStatus,
} from "@/src/lib/validation/workspaces";
import {
  changeWorkspaceStatus,
  getWorkspaceContent as getWorkspaceContentService,
  getWorkspaceDetail,
  getWorkspaceMembers as getWorkspaceMembersService,
  getWorkspaceStatsDetail,
  getWorkspacesList,
} from "@/src/services/admin/workspaces.service";

/** Workspaces controller (v1): auth → authorization → validation → service. */

export async function listWorkspaces(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "workspaces.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseWorkspaceListQuery(new URL(req.url).searchParams);
    return NextResponse.json(await getWorkspacesList(query));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getWorkspace(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "workspaces.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ workspace: await getWorkspaceDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}

export async function setWorkspaceStatus(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: ["workspaces.suspend", "workspaces.delete"], mode: "any", rateLimit: { label: "workspaces-status", limit: 30, windowMs: 60000 } });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { status, errors: statusErrors } = validateWorkspaceStatus(parsed.body.status);
  if (statusErrors || !status) return NextResponse.json({ errors: statusErrors }, { status: 400 });
  const { reason, errors: reasonErrors } = validateStatusReason(parsed.body.reason);
  if (reasonErrors) return NextResponse.json({ errors: reasonErrors }, { status: 400 });
  try {
    const workspace = await changeWorkspaceStatus(staff, id, status, reason, getRequestContext(req));
    return NextResponse.json({ workspace });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getWorkspaceMembers(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "workspaces.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ members: await getWorkspaceMembersService(id) });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getWorkspaceContent(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "workspaces.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getWorkspaceContentService(id));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getWorkspaceStats(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "workspaces.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ stats: await getWorkspaceStatsDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}
