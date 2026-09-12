import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { completeUserTask } from "@/src/services/task.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** POST — complete (spawns next instance for recurring tasks). */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    const { task, next } = await completeUserTask(user.id, wid, id);
    return NextResponse.json({ task, next: next ?? null });
  } catch (err) {
    return toApiError(err);
  }
}
