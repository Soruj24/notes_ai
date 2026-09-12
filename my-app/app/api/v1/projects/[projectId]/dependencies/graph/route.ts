import { getProjectDependencyGraphController } from "@/src/controllers/dependencies.controller";

interface Params {
  params: Promise<{ projectId: string }>;
}

/** GET /api/v1/projects/:projectId/dependencies/graph?workspaceId= — project-scoped subgraph. */
export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  return getProjectDependencyGraphController(req, projectId);
}
