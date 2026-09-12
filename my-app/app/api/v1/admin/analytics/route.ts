import { getAnalytics } from "@/src/controllers/admin/analytics.controller";

/** GET /api/v1/admin/analytics — bounded platform aggregations. */
export async function GET(req: Request) {
  return getAnalytics(req);
}
