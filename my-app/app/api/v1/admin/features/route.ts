import { listFeatures } from "@/src/controllers/admin/features.controller";

/** GET /api/v1/admin/features — flag catalog with state. */
export async function GET(req: Request) {
  return listFeatures(req);
}
