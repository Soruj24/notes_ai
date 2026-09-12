import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { purgeUserNote } from "@/src/services/note.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** DELETE /api/workspaces/[wid]/notes/[id]/purge — permanent delete. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    await purgeUserNote(user.id, wid, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
