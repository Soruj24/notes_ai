import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getOverview } from "@/src/services/admin/overview.service";

/** GET /api/admin/overview — counts + dependency health (any platform role). */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getOverview());
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
