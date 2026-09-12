import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { updateFeature } from "@/src/services/admin/features.service";

/**
 * PUT /api/admin/features/:key — partial update (enabled, rollout,
 * environment, roles, user emails). Audited with before/after.
 */
export async function PUT(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const staff = await requirePermission(req, "features.update");
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  try {
    const { key } = await ctx.params;
    const body = parsed.body as {
      enabled?: unknown;
      rolloutPercentage?: unknown;
      environment?: unknown;
      targetRoles?: unknown;
      targetUserEmails?: unknown;
    };
    const feature = await updateFeature(
      staff,
      key,
      {
        enabled: body.enabled as boolean | undefined,
        rolloutPercentage: body.rolloutPercentage as number | undefined,
        environment: body.environment as never,
        targetRoles: body.targetRoles as string[] | undefined,
        targetUserEmails: body.targetUserEmails as string[] | undefined,
      },
      getRequestContext(req),
    );
    return NextResponse.json({ feature });
  } catch (err) {
    return toApiError(err);
  }
}
