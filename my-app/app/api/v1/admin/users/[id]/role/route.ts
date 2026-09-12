import { setUserRole } from "@/src/controllers/admin/users.controller";

/** POST /api/v1/admin/users/:id/role — platform role change (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return setUserRole(req, id);
}
