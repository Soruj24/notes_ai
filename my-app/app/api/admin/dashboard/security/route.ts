import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getSecurityOverview } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/security — latest security events + counts. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSecurityOverview());
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
