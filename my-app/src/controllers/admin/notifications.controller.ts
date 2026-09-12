import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseInboxQuery } from "@/src/lib/validation/notifications";
import type {
  AdminNotificationPriority,
  AdminNotificationSeverity,
  AdminNotificationSource,
} from "@/src/lib/db/admin-enums";
import {
  getInbox as getInboxService,
  markAllRead as markAllReadService,
  markRead as markReadService,
} from "@/src/services/admin/notifications.service";

/** Staff inbox controller (v1). */

export async function getInbox(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "notifications.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseInboxQuery(new URL(req.url).searchParams);
    return NextResponse.json(
      await getInboxService(staff, {
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

export async function markRead(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "notifications.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await markReadService(staff, id));
  } catch (err) {
    return toApiError(err);
  }
}

export async function markAllRead(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "notifications.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await markAllReadService(staff));
  } catch (err) {
    return toApiError(err);
  }
}
