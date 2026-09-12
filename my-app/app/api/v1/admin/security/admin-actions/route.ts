import { listAdminActions } from "@/src/controllers/admin/security.controller";

/** GET /api/v1/admin/security/admin-actions — recent privileged actions. */
export async function GET(req: Request) {
  return listAdminActions(req);
}
