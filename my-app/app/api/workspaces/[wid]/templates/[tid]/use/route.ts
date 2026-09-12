import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { instantiateTemplate } from "@/src/services/template.service";

interface RouteParams {
  params: Promise<{ wid: string; tid: string }>;
}

/**
 * POST — instantiate into independent notes/tasks/project/goals.
 * { date?: ISO } anchors {{date}} and due offsets. Copies only.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, tid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  let date = new Date();
  if (parsed.body.date !== undefined) {
    date = new Date(parsed.body.date as string);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { errors: { date: ["Invalid date."] } },
        { status: 400 },
      );
    }
  }
  try {
    const created = await instantiateTemplate(user.id, wid, tid, date);
    return NextResponse.json({ created }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
