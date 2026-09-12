import { getErrors } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/errors — provider status, failed runs, rate limits. */
export async function GET(req: Request) {
  return getErrors(req);
}
