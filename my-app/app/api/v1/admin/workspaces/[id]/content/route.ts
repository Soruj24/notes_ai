import { getWorkspaceContent } from "@/src/controllers/admin/workspaces.controller";

/** GET /api/v1/admin/workspaces/:id/content — recent items (titles only). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getWorkspaceContent(req, id);
}
