import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { reopenUserTask } from "@/src/services/task.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** POST — reopen a completed task. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    return NextResponse.json({ task: await reopenUserTask(user.id, wid, id) });
  } catch (err) {
    return toApiError(err);
  }
}
