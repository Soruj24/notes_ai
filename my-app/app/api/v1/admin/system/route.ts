import { getStatus } from "@/src/controllers/admin/system.controller";

/** GET /api/v1/admin/system — dependency health + platform totals. */
export async function GET(req: Request) {
  return getStatus(req);
}
