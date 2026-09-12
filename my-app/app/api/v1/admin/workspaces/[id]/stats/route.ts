import { getWorkspaceStats } from "@/src/controllers/admin/workspaces.controller";

/** GET /api/v1/admin/workspaces/:id/stats — members, content, storage, AI. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getWorkspaceStats(req, id);
}
