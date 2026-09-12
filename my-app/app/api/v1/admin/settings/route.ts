import { deleteSetting, listSettings, putSetting } from "@/src/controllers/admin/settings.controller";

/** GET /api/v1/admin/settings — grouped typed entries. */
export async function GET(req: Request) {
  return listSettings(req);
}

/** PUT /api/v1/admin/settings — validated write (audited). */
export async function PUT(req: Request) {
  return putSetting(req);
}

/** DELETE /api/v1/admin/settings?key= — reset to default (audited). */
export async function DELETE(req: Request) {
  return deleteSetting(req);
}
