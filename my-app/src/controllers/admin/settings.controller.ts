import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { isSettingKey } from "@/src/lib/settings/catalog";
import { getSettings, getSettingsHistory, resetSetting, setSetting } from "@/src/services/admin/settings.service";

/** System settings controller (v1). */

export async function listSettings(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "settings.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSettings());
  } catch (err) {
    return toApiError(err);
  }
}

export async function putSetting(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "settings.update", rateLimit: { label: "settings-update", limit: 30, windowMs: 60000 } });
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

export async function deleteSetting(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "settings.update", rateLimit: { label: "settings-update", limit: 30, windowMs: 60000 } });
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

export async function getHistory(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "settings.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getSettingsHistory());
  } catch (err) {
    return toApiError(err);
  }
}
