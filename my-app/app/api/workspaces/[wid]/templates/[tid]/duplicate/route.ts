import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { duplicateTemplate } from "@/src/services/template.service";

interface RouteParams {
  params: Promise<{ wid: string; tid: string }>;
}

/** POST — duplicate into the workspace library. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, tid } = await params;
  try {
    const template = await duplicateTemplate(user.id, wid, tid);
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
