import { setWorkspaceStatus } from "@/src/controllers/admin/workspaces.controller";

/** POST /api/v1/admin/workspaces/:id/status — lifecycle transition (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return setWorkspaceStatus(req, id);
}
