import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getSystemStatus } from "@/src/services/admin/system.service";

/** System status controller (v1). Read-only health + totals. */

export async function getStatus(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "system.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSystemStatus());
  } catch (err) {
    return toApiError(err);
  }
}
