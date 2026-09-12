import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { previewWeek } from "@/src/services/planner.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/**
 * GET /api/workspaces/[wid]/planner/week — weekly preview, never mutates.
 * ?date=ISO (any day in the target week). Applying reuses POST /planner.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);

  const raw = url.searchParams.get("date");
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { errors: { date: ["Invalid date."] } },
      { status: 400 },
    );
  }
  try {
    const plan = await previewWeek(user.id, wid, date);
    return NextResponse.json({ plan });
  } catch (err) {
    return toApiError(err);
  }
}
