import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { deleteUserReminder, updateUserReminder } from "@/src/services/reminder.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

const STATUSES = ["pending", "sent", "dismissed", "cancelled", "snoozed"] as const;

/** PATCH — title/remindAt/status/snooze. Dismiss via { status: "dismissed" }. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (b.status !== undefined && !(STATUSES as readonly string[]).includes(b.status as string)) {
    return NextResponse.json(
      { errors: { status: ["Invalid status."] } },
      { status: 400 },
    );
  }
  let remindAt: Date | undefined;
  if (b.remindAt !== undefined) {
    remindAt = new Date(b.remindAt as string);
    if (Number.isNaN(remindAt.getTime())) {
      return NextResponse.json(
        { errors: { remindAt: ["Invalid reminder date."] } },
        { status: 400 },
      );
    }
  }
  let snoozedUntil: Date | null | undefined;
  if (b.snoozedUntil !== undefined) {
    if (b.snoozedUntil === null) snoozedUntil = null;
    else {
      snoozedUntil = new Date(b.snoozedUntil as string);
      if (Number.isNaN((snoozedUntil as Date).getTime())) {
        return NextResponse.json(
          { errors: { snoozedUntil: ["Invalid snooze date."] } },
          { status: 400 },
        );
      }
    }
  }
  try {
    const reminder = await updateUserReminder({
      userId: user.id,
      workspaceId: wid,
      reminderId: id,
      title: typeof b.title === "string" ? b.title : undefined,
      remindAt,
      status: b.status as never,
      snoozedUntil,
    });
    return NextResponse.json({ reminder });
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
    await deleteUserReminder(user.id, wid, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
