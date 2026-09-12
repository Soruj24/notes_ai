import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { validateEventUpdate } from "@/src/lib/validation/events";
import { deleteUserEvent, getUserEvent, updateUserEvent } from "@/src/services/event.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** GET /api/workspaces/[wid]/events/[id] — read one. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    return NextResponse.json({ event: await getUserEvent(user.id, wid, id) });
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — scalar fields. Recurring instances edit the whole series. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const result = validateEventUpdate(parsed.body);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  try {
    const event = await updateUserEvent({
      userId: user.id,
      workspaceId: wid,
      eventId: id,
      ...result.data,
    });
    return NextResponse.json({ event });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — permanent delete with ownership check. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    await deleteUserEvent(user.id, wid, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
