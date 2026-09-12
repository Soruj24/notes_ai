import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { getOrCreateTag, listTags } from "@/src/repositories/tag.repository";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/tags — list. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  try {
    return NextResponse.json({ tags: await listTags(user.id, wid) });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/tags — find-or-create { name }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const name =
    typeof parsed.body.name === "string" ? parsed.body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { errors: { name: ["Name is required."] } },
      { status: 400 },
    );
  }
  try {
    const tag = await getOrCreateTag(user.id, wid, name);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
