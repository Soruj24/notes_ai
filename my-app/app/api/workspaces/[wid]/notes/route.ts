import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { createUserNote, listUserNotes } from "@/src/services/note.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

function filtersFromUrl(url: URL) {
  const favorite = url.searchParams.get("favorite");
  const archived = url.searchParams.get("archived");
  const trash = url.searchParams.get("trash");
  const limit = Number(url.searchParams.get("limit"));
  return {
    query: url.searchParams.get("query") ?? undefined,
    tagId: url.searchParams.get("tagId") ?? undefined,
    projectId: url.searchParams.get("projectId") ?? undefined,
    isFavorite: favorite === null ? undefined : favorite === "1",
    isArchived: archived === null ? undefined : archived === "1",
    isDeleted: trash === "1" ? true : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  };
}

/** GET /api/workspaces/[wid]/notes — list with filters. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    const notes = await listUserNotes(
      user.id,
      wid,
      filtersFromUrl(new URL(req.url)),
    );
    return NextResponse.json({ notes });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/notes — create. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  const title =
    typeof parsed.body.title === "string" ? parsed.body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { errors: { title: ["Title is required."] } },
      { status: 400 },
    );
  }
  const asStringArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : undefined;
  const asOptionalString = (v: unknown): string | undefined =>
    typeof v === "string" && v.length ? v : undefined;

  try {
    const note = await createUserNote({
      userId: user.id,
      workspaceId: wid,
      title,
      body:
        typeof parsed.body.body === "string" ? parsed.body.body : undefined,
      tagIds: asStringArray(parsed.body.tagIds),
      projectId: asOptionalString(parsed.body.projectId),
      goalId: asOptionalString(parsed.body.goalId),
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
