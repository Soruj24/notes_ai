import { requireMembership, requireWritableMembership } from "@/src/repositories/base";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
  type TemplateRecord,
} from "@/src/repositories/template.repository";
import { createUserGoal } from "@/src/services/goal.service";
import { createUserNote } from "@/src/services/note.service";
import { createUserProject } from "@/src/services/project.service";
import { createUserTask } from "@/src/services/task.service";
import { DEFAULT_TEMPLATES } from "@/src/lib/templates/defaults";
import type { TemplateKind } from "@/src/lib/db/enums";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Template use-cases: library management + instantiation into live data. */

export async function listUserTemplates(
  userId: string,
  workspaceId: string,
  kind?: TemplateKind,
): Promise<TemplateRecord[]> {
  await requireFlag("templates", userId);
  await requireMembership(userId, workspaceId);
  await ensureDefaultTemplates(userId);
  return listTemplates(userId, workspaceId, kind);
}

/** Seed the nine built-in templates once (global, public rows). */
export async function ensureDefaultTemplates(userId: string): Promise<number> {
  const { Template } = await import("@/src/models/template.model");
  const { connectDb } = await import("@/src/lib/db/connection");
  await connectDb();
  const existing = await Template.countDocuments({ isPublic: true });
  if (existing > 0) return 0;
  // Best-effort owner attribution; templates are public regardless.
  const { findUserById } = await import("@/src/repositories/user.repository");
  const user = await findUserById(userId);
  if (!user) return 0;
  try {
    await Template.insertMany(
      DEFAULT_TEMPLATES.map((t) => ({
        ownerId: user.id,
        kind: t.kind,
        title: t.title,
        payload: t.payload,
        isPublic: true,
      })),
      { ordered: false },
    );
  } catch {
    // Lost a seed race: rows now exist.
  }
  return DEFAULT_TEMPLATES.length;
}

export async function createUserTemplate(input: {
  userId: string;
  workspaceId?: string;
  kind: TemplateKind;
  title: string;
  payload: Record<string, unknown>;
}): Promise<TemplateRecord> {
  await requireFlag("templates", input.userId);
  if (input.workspaceId) await requireWritableMembership(input.userId, input.workspaceId);
  const template = await createTemplate(input);
  if (input.workspaceId) {
    await logActivity({
      workspaceId: input.workspaceId,
      actorId: input.userId,
      action: "created",
      entityType: "workspace",
      entityId: template.id,
    }).catch(() => undefined);
  }
  return template;
}

export async function getTemplateDetail(
  userId: string,
  workspaceId: string | undefined,
  templateId: string,
): Promise<TemplateRecord> {
  await requireFlag("templates", userId);
  const { Template } = await import("@/src/models/template.model");
  const { connectDb } = await import("@/src/lib/db/connection");
  const { oid } = await import("@/src/repositories/base");
  const { NotFoundError, ForbiddenError } = await import("@/src/lib/db/errors");
  await connectDb();
  const doc = await Template.findById(oid(templateId, "templateId")).lean();
  if (!doc) throw new NotFoundError("Template not found.");
  if (!doc.isPublic && String(doc.ownerId) !== userId) {
    throw new ForbiddenError("Template not found.");
  }
  if (workspaceId) await requireMembership(userId, workspaceId);
  const rec = doc as unknown as Record<string, unknown>;
  return {
    id: String(rec.id ?? rec._id),
    workspaceId: rec.workspaceId ? String(rec.workspaceId) : undefined,
    ownerId: String(rec.ownerId),
    kind: rec.kind,
    title: rec.title,
    payload: rec.payload,
    isPublic: rec.isPublic,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  } as TemplateRecord;
}

export async function updateUserTemplate(input: {
  userId: string;
  templateId: string;
  title?: string;
  payload?: Record<string, unknown>;
  isPublic?: boolean;
}): Promise<TemplateRecord> {
  await requireFlag("templates", input.userId);
  return updateTemplate(input);
}

export async function deleteUserTemplate(userId: string, templateId: string): Promise<void> {
  await requireFlag("templates", userId);
  return deleteTemplate(userId, templateId);
}

export async function duplicateTemplate(
  userId: string,
  workspaceId: string | undefined,
  templateId: string,
): Promise<TemplateRecord> {
  await requireFlag("templates", userId);
  const { Template } = await import("@/src/models/template.model");
  const { connectDb } = await import("@/src/lib/db/connection");
  const { oid } = await import("@/src/repositories/base");
  await connectDb();
  const doc = await Template.findById(oid(templateId, "templateId")).lean();
  const { NotFoundError, ForbiddenError } = await import("@/src/lib/db/errors");
  if (!doc) {
    throw new NotFoundError("Template not found.");
  }
  if (!doc.isPublic && String(doc.ownerId) !== userId) {
    throw new ForbiddenError("Template not found.");
  }
  if (workspaceId) await requireWritableMembership(userId, workspaceId);
  const copy = await createTemplate({
    userId,
    workspaceId,
    kind: doc.kind as TemplateKind,
    title: `${doc.title} (copy)`,
    payload: JSON.parse(JSON.stringify(doc.payload ?? {})) as Record<string, unknown>,
  });
  return copy;
}

export interface InstantiationResult {
  notes: Array<{ id: string; title: string }>;
  tasks: Array<{ id: string; title: string }>;
  projects: Array<{ id: string; name: string }>;
  goals: Array<{ id: string; title: string }>;
}

interface PayloadNote {
  title?: string;
  body?: string;
}
interface PayloadTask {
  title: string;
  notes?: string;
  priority?: Priority;
  durationMin?: number;
  dueOffsetDays?: number;
}

function resolveVars(text: string, date: Date): string {
  return text.replace(/\{\{\s*date\s*\}\}/g, date.toLocaleDateString());
}

function asNotes(payload: Record<string, unknown>): PayloadNote[] {
  if (!Array.isArray(payload.notes)) return [];
  return payload.notes
    .filter((n): n is Record<string, unknown> => typeof n === "object" && n !== null)
    .map((n) => ({
      title: typeof n.title === "string" ? n.title : "Untitled",
      body: typeof n.body === "string" ? n.body : undefined,
    }));
}

type Priority = "low" | "medium" | "high" | "urgent";

function asPriority(value: unknown): Priority | undefined {
  return value === "low" || value === "medium" || value === "high" || value === "urgent"
    ? value
    : undefined;
}

function asTasks(payload: Record<string, unknown>): PayloadTask[] {
  if (!Array.isArray(payload.tasks)) return [];
  const out: PayloadTask[] = [];
  for (const raw of payload.tasks) {
    if (typeof raw !== "object" || raw === null) continue;
    const t = raw as Record<string, unknown>;
    if (typeof t.title !== "string" || !t.title.trim()) continue;
    out.push({
      title: t.title.trim().slice(0, 200),
      notes: typeof t.notes === "string" ? t.notes.slice(0, 50000) : undefined,
      priority: asPriority(t.priority),
      durationMin:
        Number.isFinite(Number(t.durationMin)) && Number(t.durationMin) > 0
          ? Math.min(10080, Math.floor(Number(t.durationMin)))
          : undefined,
      dueOffsetDays: Number.isFinite(Number(t.dueOffsetDays))
        ? Number(t.dueOffsetDays)
        : undefined,
    });
  }
  return out;
}

/**
 * Instantiate a template into independent notes/tasks/project/goals.
 * Copies only — no back-references, so later edits never touch the template.
 */
export async function instantiateTemplate(
  userId: string,
  workspaceId: string,
  templateId: string,
  date = new Date(),
): Promise<InstantiationResult> {
  await requireFlag("templates", userId);
  await requireWritableMembership(userId, workspaceId);
  const { Template } = await import("@/src/models/template.model");
  const { connectDb } = await import("@/src/lib/db/connection");
  const { oid } = await import("@/src/repositories/base");
  const { NotFoundError } = await import("@/src/lib/db/errors");
  await connectDb();
  const doc = await Template.findById(oid(templateId, "templateId")).lean();
  if (!doc) throw new NotFoundError("Template not found.");
  if (!doc.isPublic && String(doc.ownerId) !== userId) {
    const { ForbiddenError } = await import("@/src/lib/db/errors");
    throw new ForbiddenError("Template not found.");
  }
  const payload = (doc.payload ?? {}) as Record<string, unknown>;

  const result: InstantiationResult = { notes: [], tasks: [], projects: [], goals: [] };

  const projectRaw = payload.project as Record<string, unknown> | undefined;
  let projectId: string | undefined;
  if (projectRaw && typeof projectRaw.name === "string" && projectRaw.name.trim()) {
    const project = await createUserProject({
      userId,
      workspaceId,
      name: resolveVars(projectRaw.name.trim().slice(0, 120), date),
      description:
        typeof projectRaw.description === "string"
          ? resolveVars(projectRaw.description.slice(0, 5000), date)
          : undefined,
    });
    projectId = project.id;
    result.projects.push({ id: project.id, name: project.name });
  }

  for (const note of asNotes(payload)) {
    const created = await createUserNote({
      userId,
      workspaceId,
      title: resolveVars(note.title ?? "Untitled", date).slice(0, 200),
      body: note.body ? resolveVars(note.body, date) : undefined,
    });
    result.notes.push({ id: created.id, title: created.title });
  }

  for (const task of asTasks(payload)) {
    const dueAt =
      task.dueOffsetDays !== undefined
        ? new Date(date.getTime() + task.dueOffsetDays * 86400000)
        : undefined;
    const created = await createUserTask({
      userId,
      workspaceId,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      durationMin: task.durationMin,
      dueAt,
      projectId,
    });
    result.tasks.push({ id: created.id, title: created.title });
  }

  if (Array.isArray(payload.goals)) {
    for (const g of payload.goals) {
      if (typeof g !== "object" || g === null) continue;
      const rec = g as Record<string, unknown>;
      if (typeof rec.title !== "string" || !rec.title.trim()) continue;
      const created = await createUserGoal({
        userId,
        workspaceId,
        title: rec.title.trim().slice(0, 200),
        frequency: ["daily", "weekly", "monthly", "yearly"].includes(rec.frequency as string)
          ? (rec.frequency as "daily" | "weekly" | "monthly" | "yearly")
          : undefined,
      });
      result.goals.push({ id: created.id, title: created.title });
    }
  }

  return result;
}
