import { listUsers } from "@/src/controllers/admin/users.controller";

/** GET /api/v1/admin/users — staff directory. */
export async function GET(req: Request) {
  return listUsers(req);
}
