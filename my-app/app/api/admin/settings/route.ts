import { NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { isSettingKey } from "@/src/lib/settings/catalog";
import { getSettings, resetSetting, setSetting } from "@/src/services/admin/settings.service";

/** GET /api/admin/settings — grouped typed entries with effective values. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "settings.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSettings());
  } catch (err) {
    return toApiError(err);
  }
}

/**
 * PUT /api/admin/settings { key, value } — validated write, audited.
 * Per-setting permission re-checked in the service.
 */
export async function PUT(req: Request) {
  const staff = await requireAnyPermission(req, ["settings.update"]);
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { key, value } = parsed.body as { key?: unknown; value?: unknown };
  if (!isSettingKey(key)) {
    return NextResponse.json({ errors: { key: ["Unknown setting key."] } }, { status: 400 });
  }
  try {
    return NextResponse.json(await setSetting(staff, key, value, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}

/** DELETE /api/admin/settings?key= — reset to default, audited. */
export async function DELETE(req: Request) {
  const staff = await requireAnyPermission(req, ["settings.update"]);
  if (staff instanceof NextResponse) return staff;
  const key = new URL(req.url).searchParams.get("key");
  if (!isSettingKey(key)) {
    return NextResponse.json({ errors: { key: ["Unknown setting key."] } }, { status: 400 });
  }
  try {
    return NextResponse.json(await resetSetting(staff, key, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}
