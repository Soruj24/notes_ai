import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { getTools, setTools } from "@/src/services/admin/ai.service";

/** GET /api/admin/ai/tools — registry with enabled flags. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getTools());
  } catch (err) {
    return toApiError(err);
  }
}

/** PUT /api/admin/ai/tools { allowlist } — validated subset, audited. */
export async function PUT(req: Request) {
  const staff = await requirePermission(req, "ai.configure");
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
