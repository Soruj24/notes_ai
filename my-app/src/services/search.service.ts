import { db, requireMembership } from "@/src/repositories/base";
import { Note } from "@/src/models/note.model";
import { Task } from "@/src/models/task.model";
import { Project } from "@/src/models/project.model";
import { Goal } from "@/src/models/goal.model";
import { CalEvent } from "@/src/models/event.model";
import type {
  SearchEntityType,
  SearchGroup,
  SearchHit,
  SearchResult,
} from "@/src/lib/search/types";

export interface SearchOptions {
  types?: SearchEntityType[];
  from?: Date;
  to?: Date;
  perType?: number;
}

const DEFAULT_TYPES: SearchEntityType[] = ["notes", "tasks", "projects", "goals", "events"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inRange(date: unknown, from?: Date, to?: Date): boolean {
  if (!date) return false;
  const t = new Date(date as string).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

/**
 * Unified workspace search. Membership-gated once; each collection is
 * queried with the same predicate shape, then grouped by entity type.
 * Date bounds match each entity's primary date
 * (note.updatedAt, task.dueAt, project.dueAt, goal.targetDate, event.startsAt).
 */
export async function searchWorkspace(
  userId: string,
  workspaceId: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const member = await requireMembership(userId, workspaceId);
  await db();
  const q = query.trim();
  if (!q) return { groups: [], total: 0 };
  const rx = new RegExp(escapeRegExp(q), "i");
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const configured = await getSettingValue("search.resultsPerType", 6);
  const perType = Math.min(Math.max(options.perType ?? configured, 1), 25);
  const wsId = member.workspaceId;
  const types = options.types?.length ? options.types : DEFAULT_TYPES;
  const { from, to } = options;

  const groups: SearchGroup[] = [];

  if (types.includes("notes")) {
    const docs = await Note.find({
      workspaceId: wsId,
      isDeleted: false,
      $or: [{ title: rx }, { body: rx }],
    })
      .sort({ updatedAt: -1 })
      .limit(perType)
      .lean();
    const hits: SearchHit[] = docs
      .filter((d) => !from && !to ? true : inRange(d.updatedAt, from, to))
      .map((d) => ({
        id: String(d._id),
        title: d.title || "Untitled",
        subtitle: (d.body ?? "").replace(/\s+/g, " ").trim().slice(0, 100) || undefined,
        date: new Date(d.updatedAt).toISOString(),
        href: `/notes/${String(d._id)}`,
      }));
    if (hits.length) groups.push({ type: "notes", label: "Notes", hits });
  }

  if (types.includes("tasks")) {
    const docs = await Task.find({
      workspaceId: wsId,
      $or: [{ title: rx }, { notes: rx }],
    })
      .sort({ updatedAt: -1 })
      .limit(perType)
      .lean();
    const hits: SearchHit[] = docs
      .filter((d) => !from && !to ? true : inRange(d.dueAt, from, to))
      .map((d) => ({
        id: String(d._id),
        title: d.title,
        subtitle: [d.status.replace("_", " "), d.priority].join(" · "),
        date: d.dueAt ? new Date(d.dueAt).toISOString() : undefined,
        href: `/tasks/${String(d._id)}`,
      }));
    if (hits.length) groups.push({ type: "tasks", label: "Tasks", hits });
  }

  if (types.includes("projects")) {
    const docs = await Project.find({
      workspaceId: wsId,
      $or: [{ name: rx }, { description: rx }],
    })
      .sort({ updatedAt: -1 })
      .limit(perType)
      .lean();
    const hits: SearchHit[] = docs
      .filter((d) => !from && !to ? true : inRange(d.dueAt, from, to))
      .map((d) => ({
        id: String(d._id),
        title: d.name,
        subtitle: d.status.replace("_", " "),
        date: d.dueAt ? new Date(d.dueAt).toISOString() : undefined,
        href: `/projects/${String(d._id)}`,
      }));
    if (hits.length) groups.push({ type: "projects", label: "Projects", hits });
  }

  if (types.includes("goals")) {
    const docs = await Goal.find({
      workspaceId: wsId,
      $or: [{ title: rx }, { description: rx }],
    })
      .sort({ updatedAt: -1 })
      .limit(perType)
      .lean();
    const hits: SearchHit[] = docs
      .filter((d) => !from && !to ? true : inRange(d.targetDate, from, to))
      .map((d) => ({
        id: String(d._id),
        title: d.title,
        subtitle: d.status,
        date: d.targetDate ? new Date(d.targetDate).toISOString() : undefined,
        href: `/goals/${String(d._id)}`,
      }));
    if (hits.length) groups.push({ type: "goals", label: "Goals", hits });
  }

  if (types.includes("events")) {
    const docs = await CalEvent.find({
      workspaceId: wsId,
      $or: [{ title: rx }, { description: rx }],
    })
      .sort({ startsAt: 1 })
      .limit(perType)
      .lean();
    const hits: SearchHit[] = docs
      .filter((d) => !from && !to ? true : inRange(d.startsAt, from, to))
      .map((d) => ({
        id: String(d._id),
        title: d.title,
        subtitle: new Date(d.startsAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        date: new Date(d.startsAt).toISOString(),
        href: "/calendar",
      }));
    if (hits.length) groups.push({ type: "events", label: "Events", hits });
  }

  return { groups, total: groups.reduce((n, g) => n + g.hits.length, 0) };
}
