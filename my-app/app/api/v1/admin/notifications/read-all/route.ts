import { markAllRead } from "@/src/controllers/admin/notifications.controller";

/** POST /api/v1/admin/notifications/read-all — acknowledge the inbox. */
export async function POST(req: Request) {
  return markAllRead(req);
}
