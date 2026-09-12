import { listContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/projects — cross-workspace project search. */
export async function GET(req: Request) {
  return listContent(req, "projects");
}
