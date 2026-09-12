import { listContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/events — cross-workspace event search. */
export async function GET(req: Request) {
  return listContent(req, "events");
}
