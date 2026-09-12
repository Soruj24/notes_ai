import { NextResponse } from "next/server";
import { parseJsonBody, requireApiUser, toApiError } from "@/src/lib/api/request";
import { applyPlan, previewPlan } from "@/src/services/planner.service";

interface RouteParams {
  params: Promise<{ wid: string }>;
}

function parseDay(raw: string | null): Date | "invalid" | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

/**
 * GET /api/workspaces/[wid]/planner — preview only, never mutates.
 * ?date=ISO&workStart=&workEnd= (hours, defaults 9–17).
 */
export async function GET(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const url = new URL(req.url);

  const day = parseDay(url.searchParams.get("date"));
  if (day === "invalid") {
    return NextResponse.json(
      { errors: { date: ["Invalid date."] } },
      { status: 400 },
    );
  }
  const num = (key: string, fallback: number): number => {
    const n = Number(url.searchParams.get(key));
    return Number.isFinite(n) && n >= 0 && n <= 24 ? n : fallback;
  };
  try {
    const plan = await previewPlan(user.id, wid, day ?? new Date(), {
      workStartHour: num("workStart", 9),
      workEndHour: num("workEnd", 17),
    });
    return NextResponse.json({ plan });
  } catch (err) {
    return toApiError(err);
  }
}

/**
 * POST /api/workspaces/[wid]/planner — the ONLY mutating path (apply).
 * { items: [{ taskId, start, durationMin }] }. Explicit user confirmation
 * happens in the UI before this is ever called.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const user = await requireApiUser(req);
  if (user instanceof NextResponse) return user;
  const { wid } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;

  if (!Array.isArray(parsed.body.items) || parsed.body.items.length === 0) {
    return NextResponse.json(
      { errors: { items: ["Provide 1–50 plan items to apply."] } },
      { status: 400 },
    );
  }
  try {
    const result = await applyPlan(
      user.id,
      wid,
      parsed.body.items as Array<{ taskId: string; start: string; durationMin: number }>,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && /Provide|needs/.test(err.message)) {
      return NextResponse.json(
        { errors: { items: [err.message] } },
        { status: 400 },
      );
    }
    return toApiError(err);
  }
}
