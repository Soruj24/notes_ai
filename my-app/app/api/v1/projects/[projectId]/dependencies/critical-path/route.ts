import { getProjectCriticalPathController } from "@/src/controllers/dependencies.controller";

interface Params {
  params: Promise<{ projectId: string }>;
}

/** GET /api/v1/projects/:projectId/dependencies/critical-path?workspaceId= — DAG critical path. */
export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  return getProjectCriticalPathController(req, projectId);
}
