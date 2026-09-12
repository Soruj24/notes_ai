import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseInboxQuery } from "@/src/lib/validation/notifications";
import { getInbox } from "@/src/services/admin/notifications.service";
import type {
  AdminNotificationPriority,
  AdminNotificationSeverity,
  AdminNotificationSource,
} from "@/src/lib/db/admin-enums";

/** GET /api/admin/notifications — staff inbox with filters + unread count. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "notifications.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseInboxQuery(new URL(req.url).searchParams);
    return NextResponse.json(
      await getInbox(staff, {
        severity: query.severity as AdminNotificationSeverity | undefined,
        priority: query.priority as AdminNotificationPriority | undefined,
        source: query.source as AdminNotificationSource | undefined,
        read: query.read,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      }),
    );
  } catch (err) {
    return toApiError(err);
  }
}
