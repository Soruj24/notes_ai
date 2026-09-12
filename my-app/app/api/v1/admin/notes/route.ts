import { listContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/notes — cross-workspace note search (titles only). */
export async function GET(req: Request) {
  return listContent(req, "notes");
}
