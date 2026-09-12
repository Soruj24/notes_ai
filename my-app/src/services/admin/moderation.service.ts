import type { PlatformUser } from "@/src/lib/api/admin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/src/lib/db/errors";
import {
  ENTITY_CONFIG,
  auditVerb,
  permissionFor,
  type ModAction,
  type ModEntity,
} from "@/src/lib/moderation";
import { hasPermission } from "@/src/lib/rbac/roles";
import { findUserById } from "@/src/repositories/user.repository";
import { getWorkspaceByIdAdmin } from "@/src/repositories/workspace.repository";
import { listAuditEvents, recordAuditEvent } from "@/src/repositories/admin-audit-log.repository";
import {
  countContentDocs,
  deleteContentDoc,
  getContentDoc,
  listContentDocs,
  loadContentDoc,
  saveContentDoc,
} from "@/src/repositories/content-admin.repository";
import type { RequestContext } from "@/src/services/admin/users.service";

/**
 * Cross-workspace content moderation. Reads need `<base>.view` (route
 * gate); every lifecycle mutation re-checks moderate/delete here, writes
 * an audit entry, and never edits user content — only lifecycle flags
 * and deletion. Excerpts (never full bodies) in inspect views.
 */

export interface ModListQuery {
  search?: string;
  status?: string;
  workspaceId?: string;
  sort: string;
  dir: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface ModItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  ownerName: string;
  title: string;
  status: string;
  trashed: boolean;
  /** Events only. */
  startsAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ModDetail extends ModItem {
  excerpt: string;
  owner: { id: string; name: string; email: string; status: string } | null;
  workspace: { id: string; name: string; status: string } | null;
  history: Array<{ id: string; action: string; actorId: string; timestamp: string }>;
}

function statusOf(entity: ModEntity, doc: Record<string, unknown>): { status: string; trashed: boolean } {
  if (entity === "notes") {
    if (doc.isDeleted === true) return { status: "trashed", trashed: true };
    if (doc.isArchived === true) return { status: "archived", trashed: false };
    return { status: "active", trashed: false };
  }
  return { status: String(doc.status ?? "unknown"), trashed: false };
}

async function enrich(
  rows: Array<Record<string, unknown>>,
): Promise<{ workspaces: Map<string, string>; owners: Map<string, string> }> {
  const wsIds = [...new Set(rows.map((r) => String(r.workspaceId)))];
  const ownerIds = [...new Set(rows.map((r) => String(r.ownerId)))];
  const [workspaces, owners] = await Promise.all([
    Promise.all(wsIds.map((id) => getWorkspaceByIdAdmin(id).catch(() => null))),
    Promise.all(ownerIds.map((id) => findUserById(id).catch(() => null))),
  ]);
  return {
    workspaces: new Map(workspaces.filter((w) => w).map((w) => [w!.id, w!.name])),
    owners: new Map(owners.filter((o) => o).map((o) => [o!.id, o!.name])),
  };
}

function toItem(
  entity: ModEntity,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  workspaces: Map<string, string>,
  owners: Map<string, string>,
): ModItem {
  const titleField = ENTITY_CONFIG[entity].titleField;
  const { status, trashed } = statusOf(entity, doc as Record<string, unknown>);
  return {
    id: String(doc._id),
    workspaceId: String(doc.workspaceId),
    workspaceName: workspaces.get(String(doc.workspaceId)) ?? "(deleted workspace)",
    ownerId: String(doc.ownerId),
    ownerName: owners.get(String(doc.ownerId)) ?? "(deleted user)",
    title: String(doc[titleField] ?? "(untitled)"),
    status,
    trashed,
    ...(doc.startsAt instanceof Date ? { startsAt: doc.startsAt.toISOString() } : {}),
    updatedAt: (doc.updatedAt as Date).toISOString(),
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

function excerptOf(entity: ModEntity, doc: Record<string, unknown>, max = 300): string {
  const field = ENTITY_CONFIG[entity].excerptField;
  if (!field) return "";
  const text = typeof doc[field] === "string" ? (doc[field] as string) : "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export async function listContent(
  entity: ModEntity,
  query: ModListQuery,
): Promise<{ items: ModItem[]; total: number }> {
  const [docs, total] = await Promise.all([
    listContentDocs(entity, query),
    countContentDocs(entity, query),
  ]);
  const { workspaces, owners } = await enrich(docs);
  return { items: docs.map((d) => toItem(entity, d, workspaces, owners)), total };
}

export async function getContentDetail(entity: ModEntity, id: string): Promise<ModDetail> {
  const doc = await getContentDoc(entity, id);
  if (!doc) throw new NotFoundError(`${ENTITY_CONFIG[entity].singular} not found.`);
  const { workspaces, owners } = await enrich([doc]);
  const item = toItem(entity, doc, workspaces, owners);
  const [owner, workspace, history] = await Promise.all([
    findUserById(item.ownerId).catch(() => null),
    getWorkspaceByIdAdmin(item.workspaceId).catch(() => null),
    listAuditEvents({ resourceType: ENTITY_CONFIG[entity].singular, resourceId: item.id, limit: 25 }),
  ]);
  return {
    ...item,
    excerpt: excerptOf(entity, doc as Record<string, unknown>),
    owner: owner ? { id: owner.id, name: owner.name, email: owner.email, status: owner.status } : null,
    workspace: workspace ? { id: workspace.id, name: workspace.name, status: workspace.status } : null,
    history: history.map((h) => ({
      id: h.id,
      action: h.action,
      actorId: h.actorId,
      timestamp: h.timestamp.toISOString(),
    })),
  };
}

async function audit(
  staff: PlatformUser,
  entity: ModEntity,
  action: ModAction,
  targetId: string,
  workspaceId: string,
  metadata: Record<string, unknown> | undefined,
  ctx: RequestContext,
): Promise<void> {
  await recordAuditEvent({
    actorId: staff.user.id,
    actorRole: staff.role,
    action: auditVerb(entity, action),
    resourceType: ENTITY_CONFIG[entity].singular,
    resourceId: targetId,
    workspaceId,
    metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

/**
 * Lifecycle transition. No content edits — only flags + deletion.
 * Same-state requests are no-ops (no audit). Everything else audits
 * before/after plus the staff reason.
 */
export async function changeContentLifecycle(
  staff: PlatformUser,
  entity: ModEntity,
  id: string,
  action: ModAction,
  reason: string | undefined,
  ctx: RequestContext,
): Promise<{ item: ModItem | null; purged: boolean }> {
  const config = ENTITY_CONFIG[entity];
  if (entity !== "notes" && action === "purge") {
    throw new ValidationError({ action: ["Purge is only available for notes."] });
  }
  const needed = permissionFor(config.permBase, action);
  if (!hasPermission(staff.role, needed)) throw new ForbiddenError("Insufficient permissions.");
  if (action !== "restore" && !reason) {
    throw new ValidationError({ reason: ["A reason is required for this action."] });
  }

  const doc = await loadContentDoc(entity, id);
  if (!doc) throw new NotFoundError(`${config.singular} not found.`);
  const workspaceId = String(doc.workspaceId);

  if (action === "purge" || (action === "delete" && entity !== "notes")) {
    const before = action === "purge" ? snapshot(doc) : { status: doc.status };
    await deleteContentDoc(doc);
    await audit(staff, entity, action, id, workspaceId, { before, reason }, ctx);
    return { item: null, purged: true };
  }

  const before = snapshot(doc);
  let changed = false;
  if (entity === "notes") {
    if (action === "archive" && doc.isArchived !== true) {
      doc.isArchived = true;
      changed = true;
    } else if (action === "delete" && doc.isDeleted !== true) {
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      changed = true;
    } else if (action === "restore" && (doc.isArchived === true || doc.isDeleted === true)) {
      doc.isArchived = false;
      doc.isDeleted = false;
      doc.deletedAt = undefined;
      changed = true;
    }
  } else {
    const targets: Record<Exclude<ModEntity, "notes">, { archive: string; restore: string }> = {
      tasks: { archive: "archived", restore: "todo" },
      events: { archive: "cancelled", restore: "confirmed" },
      projects: { archive: "archived", restore: "active" },
      goals: { archive: "abandoned", restore: "active" },
    };
    const t = targets[entity as Exclude<ModEntity, "notes">];
    if (action === "archive" && doc.status !== t.archive) {
      doc.status = t.archive;
      changed = true;
    } else if (action === "restore" && doc.status !== t.restore) {
      doc.status = t.restore;
      changed = true;
    } else if (action === "delete") {
      // Unreachable: hard delete handled above. Kept for exhaustiveness.
      await deleteContentDoc(doc);
      await audit(staff, entity, action, id, workspaceId, { before, reason }, ctx);
      return { item: null, purged: true };
    }
  }
  if (!changed) {
    const { workspaces, owners } = await enrich([doc.toObject()]);
    return { item: toItem(entity, doc.toObject(), workspaces, owners), purged: false };
  }
  const saved = await saveContentDoc(doc);
  const after = snapshot(saved);
  await audit(staff, entity, action, id, workspaceId, { before, after, ...(reason ? { reason } : {}) }, ctx);
  const { workspaces, owners } = await enrich([saved]);
  return { item: toItem(entity, saved, workspaces, owners), purged: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshot(doc: any): Record<string, unknown> {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const snap: Record<string, unknown> = {};
  for (const key of ["status", "isArchived", "isDeleted", "title", "name"]) {
    if (o[key] !== undefined) snap[key] = o[key];
  }
  return snap;
}
