import { getHistory } from "@/src/controllers/admin/settings.controller";

/** GET /api/v1/admin/settings/history — settings change trail. */
export async function GET(req: Request) {
  return getHistory(req);
}
