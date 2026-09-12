import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { validateEventCreate } from "@/src/lib/validation/events";
import { listUserEvents } from "@/src/services/event.service";
import { createEventWithReminder } from "@/src/services/schedule.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/events — list (?from&?to ISO, ?status). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  try {
    const events = await listUserEvents(user.id, wid, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: url.searchParams.get("status") ?? undefined,
    } as never);
    return NextResponse.json({ events });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/events — create (+ optional reminder). */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const result = validateEventCreate(parsed.body);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  try {
    const event = await createEventWithReminder({
      userId: user.id,
      workspaceId: wid,
      ...result.data,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
