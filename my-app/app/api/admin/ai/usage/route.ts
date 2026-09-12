import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/api/admin";
import { toApiError } from "@/src/lib/api/request";
import { getAiUsage } from "@/src/services/admin/dashboard.service";

/** GET /api/admin/ai/usage?days=30 — messages/tokens, no content. */
export async function GET(req: Request) {
  const staff = await requirePermission(req, "ai.view");
  if (staff instanceof NextResponse) return staff;
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return NextResponse.json(await getAiUsage(days));
  } catch (err) {
    return toApiError(err);
  }
}
