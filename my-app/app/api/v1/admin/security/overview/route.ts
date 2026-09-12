import { getOverview } from "@/src/controllers/admin/security.controller";

/** GET /api/v1/admin/security/overview — category counts. */
export async function GET(req: Request) {
  return getOverview(req);
}
