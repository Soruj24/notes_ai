import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getFeatureStatus } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/features — flag rollup + list. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getFeatureStatus());
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
