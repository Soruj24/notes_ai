import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  removeUserSubtask,
  updateUserSubtask,
} from "@/src/services/task.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string; subId: string }>;
}

/** PATCH — rename and/or toggle a subtask. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id, subId } = await params;
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
  try {
    const task = await updateUserSubtask(user.id, wid, id, subId, {
      title: typeof b.title === "string" ? b.title.trim() : undefined,
      done: typeof b.done === "boolean" ? b.done : undefined,
    });
    return NextResponse.json({ task });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — remove a subtask. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id, subId } = await params;
  try {
    const task = await removeUserSubtask(user.id, wid, id, subId);
    return NextResponse.json({ task });
  } catch (err) {
    return toApiError(err);
  }
}
