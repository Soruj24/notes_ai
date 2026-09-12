import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getUserGrowth } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/growth?days=30 — user growth buckets. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return NextResponse.json(await getUserGrowth(days));
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
