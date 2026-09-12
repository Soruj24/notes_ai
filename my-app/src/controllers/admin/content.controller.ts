import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import { ENTITY_CONFIG, type ModEntity } from "@/src/lib/moderation";
import type { Permission } from "@/src/lib/rbac/permissions";
import { parseContentListQuery, validateAction, validateReason } from "@/src/lib/validation/moderation";
import {
  changeContentLifecycle,
  getContentDetail,
  listContent as listContentService,
} from "@/src/services/admin/moderation.service";

/** Content moderation controller (v1). Entity is bound by the route. */

function viewPermission(entity: ModEntity): Permission {
  return `${ENTITY_CONFIG[entity].permBase}.view` as Permission;
}

export async function listContent(req: Request, entity: ModEntity): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: viewPermission(entity) });
  if (staff instanceof NextResponse) return staff;
  try {
    const query = parseContentListQuery(entity, new URL(req.url).searchParams);
    return NextResponse.json(await listContentService(entity, query));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getContent(req: Request, entity: ModEntity, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: viewPermission(entity) });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ item: await getContentDetail(entity, id) });
  } catch (err) {
    return toApiError(err);
  }
}

export async function runLifecycle(req: Request, entity: ModEntity, id: string): Promise<Response> {
  // Any staff may reach the handler; the service enforces the exact
  // moderate/delete permission per action (defense in depth).
  const staff = await authorizeAdmin(req, { rateLimit: { label: "content-lifecycle", limit: 30, windowMs: 60000 } });
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
    const result = await changeContentLifecycle(staff, entity, id, action, reason, getRequestContext(req));
    return NextResponse.json(result);
  } catch (err) {
    return toApiError(err);
  }
}
