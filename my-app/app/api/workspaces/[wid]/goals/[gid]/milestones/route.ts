import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { addGoalMilestone } from "@/src/services/goal.service";

interface RouteParams {
  params: Promise<{ wid: string; gid: string }>;
}

/** POST — append a milestone { title, targetDate? }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { errors: { title: ["Title is required (max 200)."] } },
      { status: 400 },
    );
  }
  let targetDate: Date | undefined;
  if (b.targetDate) {
    targetDate = new Date(b.targetDate as string);
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { errors: { targetDate: ["Invalid target date."] } },
        { status: 400 },
      );
    }
  }
  try {
    const goal = await addGoalMilestone(user.id, wid, gid, { title, targetDate });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
