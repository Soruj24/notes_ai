import { listContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/goals — cross-workspace goal search. */
export async function GET(req: Request) {
  return listContent(req, "goals");
}
