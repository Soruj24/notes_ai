import { getUserSessions } from "@/src/controllers/admin/users.controller";

/** GET /api/v1/admin/users/:id/sessions — session summaries (no hashes). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getUserSessions(req, id);
}
