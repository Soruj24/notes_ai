import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getDashboardHealth } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/health — dependency checks + rollup status. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getDashboardHealth());
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
