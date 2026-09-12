import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { addUserSubtask } from "@/src/services/task.service";
import { validateSubtask } from "@/src/lib/validation/tasks";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** POST — append a subtask { title }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const result = validateSubtask(parsed.body);
  if (!result.ok || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  try {
    const task = await addUserSubtask(user.id, wid, id, result.data.title);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
