import { NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { isAISettingKey } from "@/src/lib/ai/settings";
import { getConfig, resetConfig, setConfig } from "@/src/services/admin/ai.service";

/** GET /api/admin/ai/config — effective config, secrets redacted. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getConfig());
  } catch (err) {
    return toApiError(err);
  }
}

/**
 * PUT /api/admin/ai/config { key, value } — validated write, audited.
 * Exact per-key permission (incl. kill switch + superadmin secrets)
 * enforced in the service.
 */
export async function PUT(req: Request) {
  const staff = await requireAnyPermission(req, ["ai.configure", "ai.disable"]);
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { key, value } = parsed.body as { key?: unknown; value?: unknown };
  if (!isAISettingKey(key)) {
    return NextResponse.json({ errors: { key: ["Unknown setting key."] } }, { status: 400 });
  }
  try {
    return NextResponse.json(await setConfig(staff, key, value, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE /api/admin/ai/config?key= — reset to default, audited. */
export async function DELETE(req: Request) {
  const staff = await requireAnyPermission(req, ["ai.configure", "ai.disable"]);
  if (staff instanceof NextResponse) return staff;
  const key = new URL(req.url).searchParams.get("key");
  if (!isAISettingKey(key)) {
    return NextResponse.json({ errors: { key: ["Unknown setting key."] } }, { status: 400 });
  }
  try {
    return NextResponse.json(await resetConfig(staff, key, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}
