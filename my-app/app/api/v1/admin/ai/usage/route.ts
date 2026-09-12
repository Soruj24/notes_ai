import { getUsage } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/usage — messages/tokens, no content. */
export async function GET(req: Request) {
  return getUsage(req);
}
