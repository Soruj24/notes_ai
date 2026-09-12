import { getUserActivity } from "@/src/controllers/admin/users.controller";

/** GET /api/v1/admin/users/:id/activity — workspace trail + audit entries. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getUserActivity(req, id);
}
