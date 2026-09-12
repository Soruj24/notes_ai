import { getWorkspaceMembers } from "@/src/controllers/admin/workspaces.controller";

/** GET /api/v1/admin/workspaces/:id/members — roster with user profiles. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getWorkspaceMembers(req, id);
}
