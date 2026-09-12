import { listEntries } from "@/src/controllers/admin/audit-logs.controller";

/** GET /api/v1/admin/audit-logs — filterable, paginated trail. */
export async function GET(req: Request) {
  return listEntries(req);
}
