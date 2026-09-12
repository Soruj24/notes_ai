import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  removeGoalMilestone,
  updateGoalMilestone,
} from "@/src/services/goal.service";

interface RouteParams {
  params: Promise<{ wid: string; gid: string; mid: string }>;
}

/** PATCH — rename / toggle / retarget a milestone. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid, mid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (b.title !== undefined && (typeof b.title !== "string" || !b.title.trim())) {
    return NextResponse.json(
      { errors: { title: ["Title must not be empty."] } },
      { status: 400 },
    );
  }
  if (b.done !== undefined && typeof b.done !== "boolean") {
    return NextResponse.json(
      { errors: { done: ["done must be a boolean."] } },
      { status: 400 },
    );
  }
  let targetDate: Date | null | undefined;
  if (b.targetDate !== undefined) {
    if (b.targetDate === null || b.targetDate === "") targetDate = null;
    else {
      targetDate = new Date(b.targetDate as string);
      if (Number.isNaN((targetDate as Date).getTime())) {
        return NextResponse.json(
          { errors: { targetDate: ["Invalid target date."] } },
          { status: 400 },
        );
      }
    }
  }
  try {
    const goal = await updateGoalMilestone(user.id, wid, gid, mid, {
      title: typeof b.title === "string" ? b.title.trim() : undefined,
      done: typeof b.done === "boolean" ? b.done : undefined,
      targetDate,
    });
    return NextResponse.json({ goal });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — remove a milestone. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid, mid } = await params;
  try {
    const goal = await removeGoalMilestone(user.id, wid, gid, mid);
    return NextResponse.json({ goal });
  } catch (err) {
    return toApiError(err);
  }
}
