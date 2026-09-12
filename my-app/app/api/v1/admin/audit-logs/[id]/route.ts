import { getEntry } from "@/src/controllers/admin/audit-logs.controller";

/** GET /api/v1/admin/audit-logs/:id — full entry incl. metadata. */
export async function GET(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  return getEntry(req, id);
}
