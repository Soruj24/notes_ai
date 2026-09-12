import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getActivityOverview } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/activity?days=30 — content + activity volume. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return NextResponse.json(await getActivityOverview(days));
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
