import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { requireFlag } from "@/src/lib/features/evaluation";
import { markAllNotificationsRead } from "@/src/repositories/notification.repository";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** POST /api/workspaces/[wid]/notifications/read-all — mark all read. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  try {
    await requireFlag("notifications", user.id, "Notifications");
  } catch (err) {
    return toApiError(err);
  }
  const { wid } = await params;
  try {
    const updated = await markAllNotificationsRead(user.id, wid);
    return NextResponse.json({ updated });
  } catch (err) {
    return toApiError(err);
  }
}
