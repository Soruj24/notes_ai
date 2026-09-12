import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { deleteUserTemplate, updateUserTemplate } from "@/src/services/template.service";
import { getTemplateDetail } from "@/src/services/template.service";

interface RouteParams {
  params: Promise<{ wid: string; tid: string }>;
}

/** GET — single template (for preview/edit). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, tid } = await params;
  try {
    return NextResponse.json({
      template: await getTemplateDetail(user.id, wid, tid),
    });
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — title/payload. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { tid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (b.title !== undefined) {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title || title.length > 200) {
      return NextResponse.json(
        { errors: { title: ["Title must not be empty (max 200)."] } },
        { status: 400 },
      );
    }
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
    const template = await updateUserTemplate({
      userId: user.id,
      templateId: tid,
      title: typeof b.title === "string" ? b.title.trim() : undefined,
      payload: b.payload as Record<string, unknown> | undefined,
    });
    return NextResponse.json({ template });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — permanent delete (owner only). */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { tid } = await params;
  try {
    await deleteUserTemplate(user.id, tid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
