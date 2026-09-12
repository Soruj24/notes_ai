import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/src/lib/api/admin";
import { getRequestContext } from "@/src/lib/api/admin-context";
import { parseJsonBody, toApiError } from "@/src/lib/api/request";
import {
  parseUserListQuery,
  validatePlatformRole,
  validateStatusReason,
  validateUserName,
  validateUserStatus,
} from "@/src/lib/validation/users";
import {
  changeUserRole,
  changeUserStatus,
  getUserActivity as getUserActivityService,
  getUserDetail,
  getUserMemberships as getUserMembershipsService,
  getUserSessions as getUserSessionsService,
  getUsersList,
  revokeUserSessions as revokeUserSessionsService,
  updateUserDisplayName,
} from "@/src/services/admin/users.service";

/**
 * Users controller (v1). Each handler runs the pipeline explicitly:
 * authentication → admin authorization → validation → service →
 * repository → database. No database logic lives here; mutations audit
 * inside the service layer.
 */

export async function listUsers(req: Request): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "users.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getUsersList(parseUserListQuery(new URL(req.url).searchParams)));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getUser(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "users.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ user: await getUserDetail(id) });
  } catch (err) {
    return toApiError(err);
  }
}

export async function patchUser(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, {
    permission: "users.update",
    rateLimit: { label: "users-update", limit: 30, windowMs: 60000 },
  });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { name, errors } = validateUserName(parsed.body.name);
  if (errors || !name) return NextResponse.json({ errors }, { status: 400 });
  try {
    const user = await updateUserDisplayName(staff, id, name, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}

export async function setUserStatus(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, {
    permission: ["users.suspend", "users.delete"],
    mode: "any",
    rateLimit: { label: "users-status", limit: 30, windowMs: 60000 },
  });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { status, errors: statusErrors } = validateUserStatus(parsed.body.status);
  if (statusErrors || !status) return NextResponse.json({ errors: statusErrors }, { status: 400 });
  const { reason, errors: reasonErrors } = validateStatusReason(parsed.body.reason);
  if (reasonErrors) return NextResponse.json({ errors: reasonErrors }, { status: 400 });
  try {
    const user = await changeUserStatus(staff, id, status, reason, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}

export async function setUserRole(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, {
    permission: "users.update",
    rateLimit: { label: "users-role", limit: 30, windowMs: 60000 },
  });
  if (staff instanceof NextResponse) return staff;
  const parsed = await parseJsonBody(req);
  if (parsed instanceof NextResponse) return parsed;
  const { role, errors } = validatePlatformRole(
    parsed.body.role === undefined ? "invalid" : parsed.body.role,
  );
  if (errors) return NextResponse.json({ errors }, { status: 400 });
  try {
    const user = await changeUserRole(staff, id, role ?? null, getRequestContext(req));
    return NextResponse.json({ user });
  } catch (err) {
    return toApiError(err);
  }
}

export async function getUserActivity(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "users.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await getUserActivityService(id));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getUserSessions(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "users.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ sessions: await getUserSessionsService(id) });
  } catch (err) {
    return toApiError(err);
  }
}

export async function revokeUserSessions(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, {
    permission: "users.view",
    rateLimit: { label: "users-revoke", limit: 30, windowMs: 60000 },
  });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json(await revokeUserSessionsService(staff, id, getRequestContext(req)));
  } catch (err) {
    return toApiError(err);
  }
}

export async function getUserMemberships(req: Request, id: string): Promise<Response> {
  const staff = await authorizeAdmin(req, { permission: "users.view" });
  if (staff instanceof NextResponse) return staff;
  try {
    return NextResponse.json({ memberships: await getUserMembershipsService(id) });
  } catch (err) {
    return toApiError(err);
  }
}
