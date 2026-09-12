import { getWorkspace } from "@/src/controllers/admin/workspaces.controller";

/** GET /api/v1/admin/workspaces/:id — inspect (owner, status history). */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getWorkspace(req, id);
}
