import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { parseUserListQuery } from "@/src/lib/validation/users";
import { getUsersList } from "@/src/services/admin/users.service";

/** GET /api/admin/users?q=&status=&role=&sort=&dir=&limit=&offset= */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseUserListQuery(new URL(req.url).searchParams);
    return NextResponse.json(await getUsersList(query));
  } catch (err) {
    return toApiError(err);
  }
}
