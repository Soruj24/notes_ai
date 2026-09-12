import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { restoreUserNote } from "@/src/services/note.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

/** POST /api/workspaces/[wid]/notes/[id]/restore — leave trash. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    return NextResponse.json({ note: await restoreUserNote(user.id, wid, id) });
  } catch (err) {
    return toApiError(err);
  }
}
