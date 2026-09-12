import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { deleteUserTask, getUserTask, updateUserTask } from "@/src/services/task.service";
import { validateTaskUpdate } from "@/src/lib/validation/tasks";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** GET /api/workspaces/[wid]/tasks/[id] — read one. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    return NextResponse.json({ task: await getUserTask(user.id, wid, id) });
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — scalar fields (subtasks have dedicated endpoints). */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const result = validateTaskUpdate(parsed.body);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  try {
    const task = await updateUserTask({
      userId: user.id,
      workspaceId: wid,
      taskId: id,
      ...result.data,
    });
    return NextResponse.json({ task });
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
    await deleteUserTask(user.id, wid, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
