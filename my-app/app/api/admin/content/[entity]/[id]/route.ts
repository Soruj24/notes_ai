import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { ENTITY_CONFIG, isModEntity, type ModEntity } from "@/src/lib/moderation";
import type { Permission } from "@/src/lib/rbac/permissions";
import { getContentDetail } from "@/src/services/admin/moderation.service";

/** GET /api/admin/content/:entity/:id — inspect (metadata + excerpt, no full body). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { entity, id } = await ctx.params;
  if (!isModEntity(entity)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }
  const staff = await requirePermission(req, `${ENTITY_CONFIG[entity as ModEntity].permBase}.view` as Permission);
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ item: await getContentDetail(entity, id) });
  } catch (err) {
    return toApiError(err);
  }
}
