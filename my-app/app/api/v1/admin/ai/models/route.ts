import { getModels } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/models — discovered + configured catalog. */
export async function GET(req: Request) {
  return getModels(req);
}
