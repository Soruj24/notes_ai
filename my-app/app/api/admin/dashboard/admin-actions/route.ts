import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getRecentAdminActions } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/dashboard/admin-actions — latest audit entries. */
export async function GET(req: Request) {
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ actions: await getRecentAdminActions() });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
