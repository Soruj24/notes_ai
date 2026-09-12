import { NextResponse } from "next/server";
import { requireApiUser, toApiError } from "@/src/lib/api/request";
import { getAnalytics, type AnalyticsRange } from "@/src/services/analytics.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

const RANGES: AnalyticsRange[] = ["today", "week", "month"];

/** GET /api/workspaces/[wid]/analytics — real-data metrics (?range=). */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const raw = new URL(req.url).searchParams.get("range") ?? "week";
  if (!RANGES.includes(raw as AnalyticsRange)) {
    return NextResponse.json(
      { errors: { range: ["Use today, week, or month."] } },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({
      analytics: await getAnalytics(user.id, wid, raw as AnalyticsRange),
    });
  } catch (err) {
    return toApiError(err);
  }
}
