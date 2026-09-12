import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { isAISettingKey } from "@/src/lib/ai/settings";
import {
  getAIOverview,
  getConfig as getAIConfigState,
  getErrors as getAIErrors,
  getModelCatalog,
  getProviders as getAIProviders,
  getTools as getAITools,
  resetConfig,
  setConfig,
  setTools,
} from "@/src/services/admin/ai.service";
import { getAiUsage } from "@/src/services/admin/dashboard.service";

/** AI Control Center controller (v1). Secrets never leave the service. */

export async function getOverview(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAIOverview());
  } catch (err) {
    return toApiError(err);
  }
}

export async function getProviders(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAIProviders());
  } catch (err) {
    return toApiError(err);
  }
}

export async function getModels(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getModelCatalog());
  } catch (err) {
    return toApiError(err);
  }
}

export async function getConfig(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAIConfigState());
  } catch (err) {
    return toApiError(err);
  }
}

export async function putConfig(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: ["ai.configure", "ai.disable"], mode: "any", rateLimit: { label: "ai-config", limit: 30, windowMs: 60000 } });
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

export async function deleteConfig(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: ["ai.configure", "ai.disable"], mode: "any", rateLimit: { label: "ai-config", limit: 30, windowMs: 60000 } });
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

export async function getTools(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAITools());
  } catch (err) {
    return toApiError(err);
  }
}

export async function putTools(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.configure", rateLimit: { label: "ai-tools", limit: 30, windowMs: 60000 } });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  try {
    const { allowlist } = parsed.body as { allowlist?: unknown };
    return NextResponse.json(await setTools(staff, allowlist, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getUsage(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return NextResponse.json(await getAiUsage(days));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getErrors(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "ai.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getAIErrors());
  } catch (err) {
    return toApiError(err);
  }
}
