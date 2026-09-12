import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import {
  deleteUserGoal,
  getGoalDetail,
  updateUserGoal,
} from "@/src/services/goal.service";

interface RouteParams {
  params: Promise<{ wid: string; gid: string }>;
}

/** GET — goal + projects + tasks + computed progress. */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid } = await params;
  try {
    return NextResponse.json(await getGoalDetail(user.id, wid, gid));
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH — title/description/status/frequency/targetDate/progress. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const b = parsed.body;

  if (b.status !== undefined && !["active", "achieved", "abandoned"].includes(b.status as string)) {
    return NextResponse.json(
      { errors: { status: ["Invalid status."] } },
      { status: 400 },
    );
  }
  if (b.frequency !== undefined && !["daily", "weekly", "monthly", "yearly"].includes(b.frequency as string)) {
    return NextResponse.json(
      { errors: { frequency: ["Invalid frequency."] } },
      { status: 400 },
    );
  }
  let targetDate: Date | null | undefined;
  if (b.targetDate !== undefined) {
    if (b.targetDate === null || b.targetDate === "") targetDate = null;
    else {
      targetDate = new Date(b.targetDate as string);
      if (Number.isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { errors: { targetDate: ["Invalid target date."] } },
          { status: 400 },
        );
      }
    }
  }
  try {
    const goal = await updateUserGoal({
      userId: user.id,
      workspaceId: wid,
      goalId: gid,
      title: typeof b.title === "string" ? b.title.trim() : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
      status: b.status as never,
      frequency: b.frequency as never,
      targetDate,
      progress: typeof b.progress === "number" ? b.progress : undefined,
    });
    return NextResponse.json({ goal });
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE — permanent delete with ownership check. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid, gid } = await params;
  try {
    await deleteUserGoal(user.id, wid, gid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toApiError(err);
  }
}
