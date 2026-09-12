import { deleteConfig, getConfig, putConfig } from "@/src/controllers/admin/ai.controller";

/** GET /api/v1/admin/ai/config — effective config, secrets redacted. */
export async function GET(req: Request) {
  return getConfig(req);
}

/** PUT /api/v1/admin/ai/config — validated write (audited). */
export async function PUT(req: Request) {
  return putConfig(req);
}

/** DELETE /api/v1/admin/ai/config?key= — reset to default (audited). */
export async function DELETE(req: Request) {
  return deleteConfig(req);
}
