import { exportEntries } from "@/src/controllers/admin/audit-logs.controller";

/** GET /api/v1/admin/audit-logs/export — CSV download (self-audited). */
export async function GET(req: Request) {
  return exportEntries(req);
}
