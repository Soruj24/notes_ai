import { getTools, putTools } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/tools — registry with enabled flags. */
export async function GET(req: Request) {
  return getTools(req);
}

/** PUT /api/v1/admin/ai/tools — replace the allowlist (audited). */
export async function PUT(req: Request) {
  return putTools(req);
}
