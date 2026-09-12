import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { createUserTemplate, listUserTemplates } from "@/src/services/template.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

const KINDS = ["note", "task", "project", "plan"] as const;

/** GET /api/workspaces/[wid]/templates — library (?kind). Seeds defaults. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== null && !(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { errors: { kind: ["Invalid template kind."] } },
      { status: 400 },
    );
  }
  try {
    const templates = await listUserTemplates(
      user.id,
      wid,
      (kind as (typeof KINDS)[number] | null) ?? undefined,
    );
    return NextResponse.json({ templates });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/templates — create { kind, title, payload? }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (!(KINDS as readonly string[]).includes(b.kind as string)) {
    return NextResponse.json(
      { errors: { kind: ["Invalid template kind."] } },
      { status: 400 },
    );
  }
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { errors: { title: ["Title is required (max 200)."] } },
      { status: 400 },
    );
  }
  if (
    b.payload !== undefined &&
    (typeof b.payload !== "object" || b.payload === null || Array.isArray(b.payload))
  ) {
    return NextResponse.json(
      { errors: { payload: ["Payload must be an object."] } },
      { status: 400 },
    );
  }
  try {
    const template = await createUserTemplate({
      userId: user.id,
      workspaceId: wid,
      kind: b.kind as (typeof KINDS)[number],
      title,
      payload: (b.payload ?? {}) as Record<string, unknown>,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
