import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getAiUsage } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/ai-usage?days=30 — messages/tokens by day. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return NextResponse.json(await getAiUsage(days));
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
