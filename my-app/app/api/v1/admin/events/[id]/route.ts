import { getContent } from "@/src/controllers/admin/content.controller";

/** GET /api/v1/admin/events/:id — inspect. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getContent(req, "events", id);
}
