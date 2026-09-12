import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { requireFlag } from "@/src/lib/features/evaluation";
import {
  archiveNotification,
  markNotificationRead,
} from "@/src/repositories/notification.repository";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/**
 * PATCH — { status: "read" } marks read, { status: "dismissed" } dismisses
 * (archived). Dismiss is terminal for inbox display.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  try {
    await requireFlag("notifications", user.id, "Notifications");
  } catch (err) {
    return toApiError(err);
  }
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const status = parsed.body.status;
  if (status !== "read" && status !== "dismissed") {
    return NextResponse.json(
      { errors: { status: ["Use read or dismissed."] } },
      { status: 400 },
    );
  }
  try {
    const notification =
      status === "read"
        ? await markNotificationRead(user.id, wid, id)
        : await archiveNotification(user.id, wid, id);
    return NextResponse.json({ notification });
  } catch (err) {
    return toApiError(err);
  }
}
