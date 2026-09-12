import { revokeUserSessions } from "@/src/controllers/admin/users.controller";

/** POST /api/v1/admin/users/:id/sessions/revoke — sign out everywhere (audited). */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return revokeUserSessions(req, id);
}
