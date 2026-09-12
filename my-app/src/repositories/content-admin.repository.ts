import { Note } from "@/src/models/note.model";
import { Task } from "@/src/models/task.model";
import { CalEvent } from "@/src/models/event.model";
import { Project } from "@/src/models/project.model";
import { Goal } from "@/src/models/goal.model";
import { db, oid } from "@/src/repositories/base";
import type { ModEntity } from "@/src/lib/moderation";

/**
 * Unscoped cross-workspace persistence for admin moderation. Callers must
 * hold the matching moderate/delete permission (enforced in the service);
 * user paths never touch these functions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;

const MODELS: Record<ModEntity, AnyModel> = {
  notes: Note,
  tasks: Task,
  events: CalEvent,
  projects: Project,
  goals: Goal,
};

export interface ContentListInput {
  search?: string;
  /** Entity-specific status value (notes: active|archived|trashed). */
  status?: string;
  workspaceId?: string;
  sort: string;
  dir: "asc" | "desc";
  limit: number;
  offset: number;
}

const TITLE_FIELDS: Record<ModEntity, string> = {
  notes: "title",
  tasks: "title",
  events: "title",
  projects: "name",
  goals: "title",
};

function statusFilter(entity: ModEntity, status?: string): Record<string, unknown> {
  if (!status || status === "all") return {};
  if (entity === "notes") {
    if (status === "trashed") return { isDeleted: true };
    if (status === "archived") return { isArchived: true, isDeleted: false };
    if (status === "active") return { isDeleted: false, isArchived: false };
    return {};
  }
  return { status };
}

function sortSpec(entity: ModEntity, sort: string, dir: "asc" | "desc"): Record<string, 1 | -1> {
  const allowed = ["updatedAt", "createdAt", "title", ...(entity === "events" ? ["startsAt"] : [])];
  const column = allowed.includes(sort) ? sort : "updatedAt";
  const field = column === "title" ? TITLE_FIELDS[entity] : column;
  const direction = dir === "asc" ? 1 : -1;
  return field === "updatedAt" || field === "createdAt" || field === "startsAt"
    ? { [field]: direction }
    : { [field]: direction, updatedAt: -1 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listContentDocs(entity: ModEntity, input: ContentListInput): Promise<any[]> {
  await db();
  const titleField = TITLE_FIELDS[entity];
  const filter: Record<string, unknown> = {
    ...(input.workspaceId ? { workspaceId: oid(input.workspaceId, "workspaceId") } : {}),
    ...(input.search?.trim()
      ? { [titleField]: { $regex: input.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {}),
    ...statusFilter(entity, input.status),
  };
  const limit = Math.min(Math.max(input.limit || 25, 1), 100);
  const offset = Math.max(input.offset || 0, 0);
  return MODELS[entity].find(filter).sort(sortSpec(entity, input.sort, input.dir)).skip(offset).limit(limit).lean();
}

export async function countContentDocs(entity: ModEntity, input: Pick<ContentListInput, "search" | "status" | "workspaceId">): Promise<number> {
  await db();
  const titleField = TITLE_FIELDS[entity];
  const filter: Record<string, unknown> = {
    ...(input.workspaceId ? { workspaceId: oid(input.workspaceId, "workspaceId") } : {}),
    ...(input.search?.trim()
      ? { [titleField]: { $regex: input.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {}),
    ...statusFilter(entity, input.status),
  };
  return MODELS[entity].countDocuments(filter);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getContentDoc(entity: ModEntity, id: string): Promise<any | null> {
  await db();
  return MODELS[entity].findById(oid(id, "id")).lean();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadContentDoc(entity: ModEntity, id: string): Promise<any | null> {
  await db();
  return MODELS[entity].findById(oid(id, "id"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveContentDoc(doc: any): Promise<any> {
  await doc.save();
  return doc.toObject();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteContentDoc(doc: any): Promise<void> {
  await doc.deleteOne();
}
