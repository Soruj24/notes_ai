import { listWorkspaces } from "@/src/controllers/admin/workspaces.controller";

/** GET /api/v1/admin/workspaces — cross-workspace directory. */
export async function GET(req: Request) {
  return listWorkspaces(req);
}
