import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { ENTITY_CONFIG, isModEntity, type ModEntity } from "@/src/lib/moderation";
import type { Permission } from "@/src/lib/rbac/permissions";
import { parseContentListQuery } from "@/src/lib/validation/moderation";
import { listContent } from "@/src/services/admin/moderation.service";

/** GET /api/admin/content/:entity?q=&status=&workspace=&sort=&dir=&limit=&offset= */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { entity } = await ctx.params;
  if (!isModEntity(entity)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }
  const staff = await requirePermission(req, `${ENTITY_CONFIG[entity as ModEntity].permBase}.view` as Permission);
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseContentListQuery(entity, new URL(req.url).searchParams);
    return NextResponse.json(await listContent(entity, query));
  } catch (err) {
    return toApiError(err);
  }
}
