import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { createUserGoal, listGoalsWithProgress } from "@/src/services/goal.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/** GET /api/workspaces/[wid]/goals — full list (?status). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  try {
    const withProgress = await listGoalsWithProgress(
      user.id,
      wid,
      status === "active" || status === "achieved" || status === "abandoned"
        ? status
        : undefined,
    );
    return NextResponse.json({
      goals: withProgress.map((w) => ({
        ...w.goal,
        computedProgress: w.progress,
      })),
    });
  } catch (err) {
    return toApiError(err);
  }
}

/** POST /api/workspaces/[wid]/goals — create { title, description?, targetDate? }. */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
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
  if (b.frequency !== undefined && !["daily", "weekly", "monthly", "yearly"].includes(b.frequency as string)) {
    return NextResponse.json(
      { errors: { frequency: ["Invalid frequency."] } },
      { status: 400 },
    );
  }
  try {
    const goal = await createUserGoal({
      userId: user.id,
      workspaceId: wid,
      title,
      description:
        typeof b.description === "string" && b.description.trim()
          ? b.description.trim().slice(0, 5000)
          : undefined,
      frequency: b.frequency as never,
      targetDate,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
