import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { markAllRead } from "@/src/services/admin/notifications.service";

/** POST /api/admin/notifications/read-all — acknowledge the whole inbox. */
export async function POST(req: Request) {
  const staff = await requirePermission(req, "notifications.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await markAllRead(staff));
  } catch (err) {
    return toApiError(err);
  }
}
