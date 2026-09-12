import { deleteDependency } from "@/src/controllers/dependencies.controller";

interface Params {
  params: Promise<{ id: string }>;
}

/** DELETE /api/v1/dependencies/:id?workspaceId= — workspace-isolated delete. */
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  return deleteDependency(req, id);
}
