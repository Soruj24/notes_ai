import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { countUserTasks } from "@/src/services/task.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/tasks/counts — per-view counts. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    return NextResponse.json({ counts: await countUserTasks(user.id, wid) });
  } catch (err) {
    return toApiError(err);
  }
}
