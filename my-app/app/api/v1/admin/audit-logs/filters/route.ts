import { listFilterOptions } from "@/src/controllers/admin/audit-logs.controller";

/** GET /api/v1/admin/audit-logs/filters — distinct actions, resources, actors. */
export async function GET(req: Request) {
  return listFilterOptions(req);
}
