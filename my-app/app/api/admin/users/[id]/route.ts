import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { validateUserName } from "@/src/lib/validation/users";
import {
  getRequestContext,
} from "@/src/lib/api/admin-context";
import {
  getUserDetail,
  updateUserDisplayName,
} from "@/src/services/admin/users.service";

/** GET /api/admin/users/:id — staff-only profile (includes suspension reason). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ user: await getUserDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}

/** PATCH /api/admin/users/:id { name } — edit display name. */
export async function PATCH(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "users.update");
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { name, errors } = validateUserName(parsed.body.name);
  if (errors || !name) return NextResponse.json({ errors }, { status: 400 });
  try {
    const { id } = await ctx.params;
    const user = await updateUserDisplayName(staff, id, name, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}
