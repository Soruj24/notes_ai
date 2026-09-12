import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { getFeatures, updateFeature as updateFeatureService } from "@/src/services/admin/features.service";

/** Feature flags controller (v1). */

export async function listFeatures(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "features.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getFeatures());
  } catch (err) {
    return toApiError(err);
  }
}

export async function updateFeature(req: Request, key: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "features.update", rateLimit: { label: "features-update", limit: 30, windowMs: 60000 } });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  try {
    const body = parsed.body as {
      enabled?: unknown;
      rolloutPercentage?: unknown;
      environment?: unknown;
      targetRoles?: unknown;
      targetUserEmails?: unknown;
    };
    const feature = await updateFeatureService(
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
