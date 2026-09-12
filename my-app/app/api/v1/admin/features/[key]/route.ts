import { updateFeature } from "@/src/controllers/admin/features.controller";

/** PUT /api/v1/admin/features/:key — partial update (audited). */
export async function PUT(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { key } = await ctx.params;
  return updateFeature(req, key);
}
