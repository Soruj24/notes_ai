import { getOverview } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai — control center overview (no secrets). */
export async function GET(req: Request) {
  return getOverview(req);
}
