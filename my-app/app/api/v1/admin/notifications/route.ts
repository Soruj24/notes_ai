import { getInbox } from "@/src/controllers/admin/notifications.controller";

/** GET /api/v1/admin/notifications — staff inbox with filters. */
export async function GET(req: Request) {
  return getInbox(req);
}
