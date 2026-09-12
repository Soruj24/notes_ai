import { listContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/tasks — cross-workspace task search. */
export async function GET(req: Request) {
  return listContent(req, "tasks");
}
