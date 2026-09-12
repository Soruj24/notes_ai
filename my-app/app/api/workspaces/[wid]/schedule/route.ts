import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { agendaRange, dayRange, monthGridRange, weekRange } from "@/src/lib/scheduling/range";
import { getSchedule } from "@/src/services/schedule.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

/**
 * GET /api/workspaces/[wid]/schedule — merged events + tasks.
 * ?view=day|week|month|agenda & ?date=ISO (defaults: week, today).
 */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "week";
  const dateRaw = url.searchParams.get("date");
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { errors: { date: ["Invalid date."] } },
      { status: 400 },
    );
  }
  const range =
    view === "day"
      ? dayRange(date)
      : view === "month"
        ? monthGridRange(date)
        : view === "agenda"
          ? agendaRange(date)
          : weekRange(date);
  try {
    const schedule = await getSchedule(user.id, wid, range);
    return NextResponse.json({
      ...schedule,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    });
  } catch (err) {
    return toApiError(err);
  }
}
