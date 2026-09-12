import { getEvent } from "@/src/controllers/admin/security.controller";

/** GET /api/v1/admin/security/events/:id — full entry (sanitized). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getEvent(req, id);
}
