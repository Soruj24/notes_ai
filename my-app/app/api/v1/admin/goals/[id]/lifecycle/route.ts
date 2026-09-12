import { runLifecycle } from "@/src/controllers/admin/content.controller";

/** POST /api/v1/admin/goals/:id/lifecycle — abandon/reactivate/delete (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return runLifecycle(req, "goals", id);
}
