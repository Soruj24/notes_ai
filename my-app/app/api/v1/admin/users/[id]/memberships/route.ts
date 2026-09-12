import { getUserMemberships } from "@/src/controllers/admin/users.controller";

/** GET /api/v1/admin/users/:id/memberships — workspaces with names and roles. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getUserMemberships(req, id);
}
