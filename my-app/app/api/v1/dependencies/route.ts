import { createDependency, listDependencies } from "@/src/controllers/dependencies.controller";

/** GET /api/v1/dependencies — list edges (workspace-isolated, Zod validated). */
export async function GET(req: Request) {
  return listDependencies(req);
}

/** POST /api/v1/dependencies — create edge (auth → validation → authz → service → repo). */
export async function POST(req: Request) {
  return createDependency(req);
}
