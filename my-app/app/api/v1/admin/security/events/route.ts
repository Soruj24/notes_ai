import { listEvents } from "@/src/controllers/admin/security.controller";

/** GET /api/v1/admin/security/events — filterable, paginated event stream. */
export async function GET(req: Request) {
  return listEvents(req);
}
