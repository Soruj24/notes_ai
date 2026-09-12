import { NextResponse } from "next/server";
import { requirePlatformUser } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { isModEntity, type ModEntity } from "@/src/lib/moderation";
import {
  validateAction,
  validateReason,
} from "@/src/lib/validation/moderation";
import { changeContentLifecycle } from "@/src/services/admin/moderation.service";

/**
 * POST /api/admin/content/:entity/:id/lifecycle { action, reason? }
 * Archive/restore needs moderate; irreversible destruction needs the
 * delete permission (re-checked per action in the service). No content
 * edits exist — lifecycle only.
 */
export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { entity, id } = await ctx.params;
  if (!isModEntity(entity)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }
  // Any staff may reach the handler; the service enforces the exact
  // moderate/delete permission per action (defense in depth).
  const staff = await requirePlatformUser(req);
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  if (entity !== "notes" && parsed.body.action === "purge") {
    return NextResponse.json({ errors: { action: ["Purge is only available for notes."] } }, { status: 400 });
  }
  const { action, errors: actionErrors } = validateAction(parsed.body.action);
  if (actionErrors || !action) return NextResponse.json({ errors: actionErrors }, { status: 400 });
  const { reason, errors: reasonErrors } = validateReason(parsed.body.reason);
  if (reasonErrors) return NextResponse.json({ errors: reasonErrors }, { status: 400 });
  try {
    const result = await changeContentLifecycle(
      staff,
      entity as ModEntity,
      id,
      action,
      reason,
      getRequestContext(req),
    );
    return NextResponse.json(result);
  } catch (err) {
    return toApiError(err);
  }
}
