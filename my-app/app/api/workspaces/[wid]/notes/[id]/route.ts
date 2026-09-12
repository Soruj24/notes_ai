import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  deleteUserNote,
  getUserNote,
  updateUserNote,
} from "@/src/services/note.service";

interface RouteParams {
  params: Promise<{ wid: string; id: string }>;
}

function asOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.length ? v : undefined;
}

function asNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  return asOptionalString(v);
}

function asBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/** GET /api/workspaces/[wid]/notes/[id] — read one. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    return NextResponse.json({ note: await getUserNote(user.id, wid, id) });
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — title/body/tags/links/flags. */
export async function PATCH(req: Request, { params }: RouteParams) {
  return updateNoteRequest(req, await params);
}

/** POST — same partial update; exists for sendBeacon unmount flushes. */
export async function POST(req: Request, { params }: RouteParams) {
  return updateNoteRequest(req, await params);
}

async function updateNoteRequest(
  req: Request,
  { wid, id }: { wid: string; id: string },
) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  const tagIds =
    b.tagIds === undefined
      ? undefined
      : Array.isArray(b.tagIds) && b.tagIds.every((x) => typeof x === "string")
        ? (b.tagIds as string[])
        : null;
  if (tagIds === null) {
    return NextResponse.json(
      { errors: { tagIds: ["tagIds must be an array of strings."] } },
      { status: 400 },
    );
  }

  try {
    const note = await updateUserNote({
      userId: user.id,
      workspaceId: wid,
      noteId: id,
      title:
        typeof b.title === "string" ? b.title : undefined,
      body: typeof b.body === "string" ? b.body : undefined,
      tagIds,
      projectId: b.projectId === undefined ? undefined : asNullableString(b.projectId),
      goalId: b.goalId === undefined ? undefined : asNullableString(b.goalId),
      isPinned: asBoolean(b.isPinned),
      isFavorite: asBoolean(b.isFavorite),
      isArchived: asBoolean(b.isArchived),
    });
    return NextResponse.json({ note });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — soft delete (moves to trash). */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, id } = await params;
  try {
    const note = await deleteUserNote(user.id, wid, id);
    return NextResponse.json({ note });
  } catch (err) {
    return toApiError(err);
  }
}
