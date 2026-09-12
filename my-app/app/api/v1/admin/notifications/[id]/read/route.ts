import { markRead } from "@/src/controllers/admin/notifications.controller";

/** POST /api/v1/admin/notifications/:id/read — acknowledge one item. */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return markRead(req, id);
}
