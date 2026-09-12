import { setUserStatus } from "@/src/controllers/admin/users.controller";

/** POST /api/v1/admin/users/:id/status — lifecycle transition (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return setUserStatus(req, id);
}
