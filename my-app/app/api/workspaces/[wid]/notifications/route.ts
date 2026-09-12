import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { requireFlag } from "@/src/lib/features/evaluation";
import { listNotifications } from "@/src/repositories/notification.repository";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/notifications — inbox + unread count. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  try {
    await requireFlag("notifications", user.id, "Notifications");
  } catch (err) {
    return toApiError(err);
  }
  const { wid } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit"));
  try {
    const [notifications, unreadRows] = await Promise.all([
      listNotifications(user.id, wid, {
        status:
          status === "unread" || status === "read" || status === "archived"
            ? status
            : undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 30,
      }),
      // Bounded unread total (badges cap display at 99+ anyway).
      listNotifications(user.id, wid, { status: "unread", limit: 200 }),
    ]);
    return NextResponse.json({ notifications, unread: unreadRows.length });
  } catch (err) {
    return toApiError(err);
  }
}
