import { getProviders } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/providers — reachability + redacted catalog. */
export async function GET(req: Request) {
  return getProviders(req);
}
