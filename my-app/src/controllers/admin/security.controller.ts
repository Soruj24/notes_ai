import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseSecurityListQuery } from "@/src/lib/validation/security";
import {
  getRecentAdminActions,
  getSecurityEventDetail,
  getSecurityEvents,
  getSecurityOverview,
} from "@/src/services/admin/security.service";

/** Security console controller (v1). */

export async function getOverview(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "security.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSecurityOverview());
  } catch (err) {
    return toApiError(err);
  }
}

export async function listEvents(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "security.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseSecurityListQuery(new URL(req.url).searchParams);
    return NextResponse.json(await getSecurityEvents(query));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getEvent(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "security.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const entry = await getSecurityEventDetail(id);
    if (!entry) {
      return NextResponse.json({ error: "Security event not found." }, { status: 404 });
    }
    return NextResponse.json({ event: entry });
  } catch (err) {
    return toApiError(err);
  }
}

export async function listAdminActions(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "security.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getRecentAdminActions());
  } catch (err) {
    return toApiError(err);
  }
}
