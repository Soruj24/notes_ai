import { getDependencyGraph } from "@/src/controllers/dependencies.controller";

/** GET /api/v1/dependencies/graph?workspaceId= — full DAG + blocked + critical path + cycle. */
export async function GET(req: Request) {
  return getDependencyGraph(req);
}
