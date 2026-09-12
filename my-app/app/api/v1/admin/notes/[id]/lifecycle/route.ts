import { runLifecycle } from "@/src/controllers/admin/content.controller";

/** POST /api/v1/admin/notes/:id/lifecycle — archive/restore/trash/purge (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return runLifecycle(req, "notes", id);
}
