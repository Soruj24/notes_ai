import { getUser, patchUser } from "@/src/controllers/admin/users.controller";

/** GET /api/v1/admin/users/:id — staff-only profile. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getUser(req, id);
}

/** PATCH /api/v1/admin/users/:id — edit display name (audited). */
export async function PATCH(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return patchUser(req, id);
}
