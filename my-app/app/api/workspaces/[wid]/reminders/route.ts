import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  createUserReminder,
  listUserReminders,
} from "@/src/services/reminder.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/reminders — list (?status, ?dueBefore ISO). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);
  const dueBefore = url.searchParams.get("dueBefore");
  try {
    const reminders = await listUserReminders(user.id, wid, {
      status: url.searchParams.get("status") ?? undefined,
      dueBefore: dueBefore ? new Date(dueBefore) : undefined,
    } as never);
    return NextResponse.json({ reminders });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/reminders — create { title, remindAt, ... }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { errors: { title: ["Title is required (max 200)."] } },
      { status: 400 },
    );
  }
  const remindAt = b.remindAt ? new Date(b.remindAt as string) : null;
  if (!remindAt || Number.isNaN(remindAt.getTime())) {
    return NextResponse.json(
      { errors: { remindAt: ["Invalid reminder date."] } },
      { status: 400 },
    );
  }
  if (
    b.recurrence !== undefined &&
    !["none", "daily", "weekly", "monthly", "yearly"].includes(b.recurrence as string)
  ) {
    return NextResponse.json(
      { errors: { recurrence: ["Invalid recurrence."] } },
      { status: 400 },
    );
  }
  let recurrenceUntil: Date | undefined;
  if (b.recurrenceUntil) {
    recurrenceUntil = new Date(b.recurrenceUntil as string);
    if (Number.isNaN(recurrenceUntil.getTime())) {
      return NextResponse.json(
        { errors: { recurrenceUntil: ["Invalid recurrence end date."] } },
        { status: 400 },
      );
    }
  }
  try {
    const reminder = await createUserReminder({
      userId: user.id,
      workspaceId: wid,
      title,
      remindAt,
      channel:
        b.channel === "email" || b.channel === "push" ? b.channel : "in_app",
      taskId: typeof b.taskId === "string" && b.taskId ? b.taskId : undefined,
      eventId: typeof b.eventId === "string" && b.eventId ? b.eventId : undefined,
      noteId: typeof b.noteId === "string" && b.noteId ? b.noteId : undefined,
      recurrence: (b.recurrence as never) ?? "none",
      recurrenceUntil,
    });
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
