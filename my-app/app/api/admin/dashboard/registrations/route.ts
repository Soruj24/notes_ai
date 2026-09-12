import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getRecentRegistrations } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/registrations — latest accounts. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ users: await getRecentRegistrations() });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
