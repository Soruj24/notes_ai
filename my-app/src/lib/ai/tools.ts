import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { completeUserTask, createUserTask, listUserTasks, reopenUserTask, updateUserTask } from "@/src/services/task.service";
import { createUserNote, listUserNotes, updateUserNote } from "@/src/services/note.service";
import { createEventWithReminder, getSchedule } from "@/src/services/schedule.service";
import { deleteUserEvent, listUserEvents, updateUserEvent } from "@/src/services/event.service";
import { createUserProject, getProjectDetail, listUserProjects } from "@/src/services/project.service";
import { createUserGoal, updateUserGoal } from "@/src/services/goal.service";
import { createUserReminder } from "@/src/services/reminder.service";
import { getInsights } from "@/src/services/insights.service";
import { searchWorkspace } from "@/src/services/search.service";
import { rankHits } from "@/src/lib/ai/rank";

/**
 * NotoAI toolbelt. Every tool is workspace-scoped (userId + workspaceId bound
 * at creation), zod-validated, and service-backed. The agent NEVER touches
 * MongoDB or repositories directly — all mutations flow through services.
 */

export interface ToolContext {
  userId: string;
  workspaceId: string;
}

/**
 * Fixed tool registry. Admins toggle tools via the `ai.tools.allowlist`
 * setting, which only selects from these names — tools themselves are
 * code and can never be introduced through configuration.
 */
export const TOOL_NAMES = [
  "search_content",
  "list_tasks",
  "create_task",
  "update_task",
  "complete_task",
  "reopen_task",
  "create_note",
  "list_events",
  "create_event",
  "list_projects",
  "create_project",
  "get_productivity_stats",
  "update_note",
  "search_notes",
  "semantic_search",
  "delete_event",
  "get_project",
  "create_goal",
  "update_goal",
  "create_reminder",
  "update_event",
  "get_daily_schedule",
  "plan_day",
  "plan_week",
  "analyze_project_dependencies",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const isoDate = z.string().describe("ISO 8601 date-time string");

function href(kind: string, id: string): string {
  const base = { note: "/notes", task: "/tasks", project: "/projects", goal: "/goals" } as const;
  return `${base[kind as keyof typeof base] ?? ""}/${id}`;
}

/** ISO string → Date (services speak Dates, the model speaks strings). */
function d(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

/** Nullable variant for PATCH semantics (null clears, undefined skips). */
function dn(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

export function makeTools(ctx: ToolContext, opts: { allowlist?: readonly string[] } = {}) {
  const { userId, workspaceId: wid } = ctx;

  const search_content = tool(
    async ({ query, types }) => {
      const result = await searchWorkspace(userId, wid, query, {
        types: types as never,
        perType: 5,
      });
      return JSON.stringify(result.groups.map((g) => ({
        type: g.type,
        hits: g.hits.map((h) => ({ title: h.title, subtitle: h.subtitle, href: h.href })),
      })));
    },
    {
      name: "search_content",
      description: "Full-text search across notes, tasks, projects, goals, and events.",
      schema: z.object({
        query: z.string().min(1).describe("Search keywords"),
        types: z.array(z.enum(["notes", "tasks", "projects", "goals", "events"])).optional()
          .describe("Restrict to entity types"),
      }),
    },
  );

  const list_tasks = tool(
    async ({ view, status, projectId }) => {
      const tasks = await listUserTasks(userId, wid, {
        view: view as never,
        status: status as never,
        projectId,
        limit: 25,
      });
      return JSON.stringify(tasks.map((t) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        dueAt: t.dueAt, href: href("task", t.id),
      })));
    },
    {
      name: "list_tasks",
      description: "List tasks by view (all, today, upcoming, completed, overdue) with optional status/project filters.",
      schema: z.object({
        view: z.enum(["all", "today", "upcoming", "completed", "overdue"]).default("all"),
        status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
        projectId: z.string().optional(),
      }),
    },
  );

  const create_task = tool(
    async (input) => {
      const task = await createUserTask({
        userId,
        workspaceId: wid,
        ...input,
        startAt: d(input.startAt),
        dueAt: d(input.dueAt),
      });
      return JSON.stringify({ id: task.id, title: task.title, href: href("task", task.id) });
    },
    {
      name: "create_task",
      description: "Create a task. Resolve relative dates to ISO before calling.",
      schema: z.object({
        title: z.string().min(1).max(200),
        notes: z.string().max(50000).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        dueAt: isoDate.optional(),
        startAt: isoDate.optional(),
        projectId: z.string().optional(),
        goalId: z.string().optional(),
      }),
    },
  );

  const update_task = tool(
    async ({ taskId, startAt, dueAt, ...patch }) => {
      const task = await updateUserTask({
        userId,
        workspaceId: wid,
        taskId,
        ...patch,
        startAt: startAt === undefined ? undefined : dn(startAt),
        dueAt: dueAt === undefined ? undefined : dn(dueAt),
      });
      return JSON.stringify({ id: task.id, title: task.title, href: href("task", task.id) });
    },
    {
      name: "update_task",
      description: "Edit a task: rename, reschedule (dueAt/startAt ISO), reprioritize, archive.",
      schema: z.object({
        taskId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        notes: z.string().max(50000).optional(),
        status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueAt: isoDate.nullable().optional(),
        startAt: isoDate.nullable().optional(),
        projectId: z.string().nullable().optional(),
      }),
    },
  );

  const complete_task = tool(
    async ({ taskId }) => {
      const { task, next } = await completeUserTask(userId, wid, taskId);
      return JSON.stringify({
        id: task.id, title: task.title,
        nextInstance: next ? { id: next.id, dueAt: next.dueAt } : null,
      });
    },
    {
      name: "complete_task",
      description: "Mark a task done (spawns the next instance for recurring tasks).",
      schema: z.object({ taskId: z.string().min(1) }),
    },
  );

  const reopen_task = tool(
    async ({ taskId }) => {
      const task = await reopenUserTask(userId, wid, taskId);
      return JSON.stringify({ id: task.id, title: task.title });
    },
    {
      name: "reopen_task",
      description: "Reopen a completed task back to todo.",
      schema: z.object({ taskId: z.string().min(1) }),
    },
  );

  const create_note = tool(
    async ({ title, body }) => {
      const note = await createUserNote({ userId, workspaceId: wid, title, body });
      return JSON.stringify({ id: note.id, title: note.title, href: href("note", note.id) });
    },
    {
      name: "create_note",
      description: "Capture a note.",
      schema: z.object({
        title: z.string().min(1).max(200),
        body: z.string().max(200000).optional(),
      }),
    },
  );

  const list_events = tool(
    async ({ from, to }) => {
      const events = await listUserEvents(userId, wid, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: 25,
      });
      return JSON.stringify(events.map((e) => ({
        id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, href: "/calendar",
      })));
    },
    {
      name: "list_events",
      description: "List calendar events in an ISO date range.",
      schema: z.object({ from: isoDate.optional(), to: isoDate.optional() }),
    },
  );

  const create_event = tool(
    async (input) => {
      const event = await createEventWithReminder({
        userId,
        workspaceId: wid,
        ...input,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      });
      return JSON.stringify({ id: event.id, title: event.title, href: "/calendar" });
    },
    {
      name: "create_event",
      description: "Schedule a calendar event, optionally with a reminder.",
      schema: z.object({
        title: z.string().min(1).max(200),
        startsAt: isoDate,
        endsAt: isoDate,
        allDay: z.boolean().default(false),
        location: z.string().max(300).optional(),
        projectId: z.string().optional(),
        reminderMinutesBefore: z.number().min(0).max(10080).optional(),
      }),
    },
  );

  const list_projects = tool(
    async () => {
      const projects = await listUserProjects(userId, wid, "active");
      return JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name })));
    },
    {
      name: "list_projects",
      description: "List active projects (id + name) for linking tasks and events.",
      schema: z.object({}),
    },
  );

  const create_project = tool(
    async ({ name, description }) => {
      const project = await createUserProject({ userId, workspaceId: wid, name, description });
      return JSON.stringify({ id: project.id, name: project.name, href: href("project", project.id) });
    },
    {
      name: "create_project",
      description: "Create a project to group planned tasks.",
      schema: z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(5000).optional(),
      }),
    },
  );

  const get_productivity_stats = tool(
    async () => {
      const result = await getInsights(userId, wid);
      return JSON.stringify({ metrics: result.metrics, insights: result.insights });
    },
    {
      name: "get_productivity_stats",
      description: "Productivity metrics and rule-based insights for planning context (overdue load, completion rate, goals at risk).",
      schema: z.object({}),
    },
  );

  const update_note = tool(
    async ({ noteId, ...patch }) => {
      const note = await updateUserNote({ userId, workspaceId: wid, noteId, ...patch });
      return JSON.stringify({ id: note.id, title: note.title, href: href("note", note.id) });
    },
    {
      name: "update_note",
      description: "Edit a note: rename, rewrite body, retag, link/unlink project or goal, pin, favorite, archive.",
      schema: z.object({
        noteId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        body: z.string().max(200000).optional(),
        tagIds: z.array(z.string()).optional(),
        projectId: z.string().nullable().optional(),
        goalId: z.string().nullable().optional(),
        isPinned: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
      }),
    },
  );

  const search_notes = tool(
    async ({ query, tagId }) => {
      const notes = await listUserNotes(userId, wid, { query, tagId, limit: 10 });
      const ranked = rankHits(
        query,
        notes.map((n) => ({ title: n.title, body: n.body, updatedAt: n.updatedAt })),
      );
      const byTitle = new Map(notes.map((n) => [n.title, n]));
      return JSON.stringify(
        ranked.slice(0, 8).map((r) => {
          const full = byTitle.get(r.item.title);
          return {
            title: r.item.title,
            excerpt: (r.item.body ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
            score: Math.round(r.score * 10) / 10,
            href: full ? href("note", full.id) : undefined,
          };
        }),
      );
    },
    {
      name: "search_notes",
      description: "Relevance-ranked note search (title-weighted). Use for summaries and lookups.",
      schema: z.object({
        query: z.string().min(1).describe("Keywords; ranked by relevance, not just recency"),
        tagId: z.string().optional(),
      }),
    },
  );

  const semantic_search = tool(
    async ({ query, types }) => {
      const { semanticSearch } = await import("@/src/services/semantic.service");
      try {
        const vectorTypes = ((types ?? []) as string[]).filter(
          (t): t is "notes" | "tasks" | "projects" | "goals" =>
            t === "notes" || t === "tasks" || t === "projects" || t === "goals",
        );
        const hits = await semanticSearch(userId, wid, query, {
          types: vectorTypes.length ? vectorTypes : undefined,
          topK: 10,
        });
        return JSON.stringify(
          hits.map((h) => ({
            type: h.entityType,
            title: h.title,
            excerpt: h.excerpt,
            score: h.score,
            href: h.href,
          })),
        );
      } catch {
        // Vector path degraded (e.g. provider outage): lexical fallback.
        const result = await searchWorkspace(userId, wid, query, {
          types: types as never,
          perType: 5,
        });
        return JSON.stringify(
          result.groups.map((g) => ({
            type: g.type,
            hits: g.hits.map((h) => ({ title: h.title, href: h.href })),
            fallback: "lexical",
          })),
        );
      }
    },
    {
      name: "semantic_search",
      description:
        "Vector similarity search over notes, tasks, projects, and goals (chunked embeddings, workspace-isolated). Prefer over search_content when meaning matters more than keywords.",
      schema: z.object({
        query: z.string().min(1),
        types: z.array(z.enum(["notes", "tasks", "projects", "goals", "events"])).optional(),
      }),
    },
  );

  const delete_event = tool(
    async ({ eventId }) => {
      await deleteUserEvent(userId, wid, eventId);
      return JSON.stringify({ id: eventId, deleted: true });
    },
    {
      name: "delete_event",
      description: "Permanently delete a calendar event. Only on explicit user request.",
      schema: z.object({ eventId: z.string().min(1) }),
    },
  );

  const get_project = tool(
    async ({ projectId }) => {
      const detail = await getProjectDetail(userId, wid, projectId);
      return JSON.stringify({
        id: detail.project.id,
        name: detail.project.name,
        status: detail.project.status,
        dueAt: detail.project.dueAt,
        progress: detail.progress,
        tasks: detail.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        notes: detail.notes.map((n) => ({ id: n.id, title: n.title })),
        href: href("project", detail.project.id),
      });
    },
    {
      name: "get_project",
      description: "Full project detail: computed progress plus linked tasks and notes.",
      schema: z.object({ projectId: z.string().min(1) }),
    },
  );

  const create_goal = tool(
    async ({ title, description, frequency, targetDate }) => {
      const goal = await createUserGoal({
        userId,
        workspaceId: wid,
        title,
        description,
        frequency: frequency as never,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      });
      return JSON.stringify({ id: goal.id, title: goal.title, href: href("goal", goal.id) });
    },
    {
      name: "create_goal",
      description: "Create a goal with a daily/weekly/monthly/yearly cadence.",
      schema: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
        targetDate: isoDate.optional(),
      }),
    },
  );

  const update_goal = tool(
    async ({ goalId, ...patch }) => {
      const goal = await updateUserGoal({
        userId,
        workspaceId: wid,
        goalId,
        ...patch,
        targetDate: patch.targetDate === undefined ? undefined : dn(patch.targetDate),
      });
      return JSON.stringify({ id: goal.id, title: goal.title, href: href("goal", goal.id) });
    },
    {
      name: "update_goal",
      description: "Edit a goal: rename, status, cadence, deadline, or manual progress fallback.",
      schema: z.object({
        goalId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        status: z.enum(["active", "achieved", "abandoned"]).optional(),
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
        targetDate: isoDate.nullable().optional(),
        progress: z.number().min(0).max(100).optional(),
      }),
    },
  );

  const create_reminder = tool(
    async ({ title, remindAt, taskId, eventId }) => {
      const reminder = await createUserReminder({
        userId,
        workspaceId: wid,
        title,
        remindAt: new Date(remindAt),
        taskId,
        eventId,
      });
      return JSON.stringify({ id: reminder.id, title: reminder.title, remindAt: reminder.remindAt });
    },
    {
      name: "create_reminder",
      description: "Schedule a reminder, optionally linked to a task or event.",
      schema: z.object({
        title: z.string().min(1).max(200),
        remindAt: isoDate,
        taskId: z.string().optional(),
        eventId: z.string().optional(),
      }),
    },
  );

  const update_event = tool(
    async ({ eventId, startsAt, endsAt, projectId, ...patch }) => {
      const event = await updateUserEvent({
        userId,
        workspaceId: wid,
        eventId,
        ...patch,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        // Null (unlink) maps to no-change; the API route supports explicit clearing.
        projectId: projectId ?? undefined,
      });
      return JSON.stringify({ id: event.id, title: event.title, href: "/calendar" });
    },
    {
      name: "update_event",
      description: "Edit a calendar event: rename, reschedule (ISO), all-day flag, recurrence, location, project link.",
      schema: z.object({
        eventId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(10000).optional(),
        startsAt: isoDate.optional(),
        endsAt: isoDate.optional(),
        allDay: z.boolean().optional(),
        recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
        location: z.string().max(300).optional(),
        projectId: z.string().nullable().optional(),
      }),
    },
  );

  const get_daily_schedule = tool(
    async ({ date }) => {
      const day = date ? new Date(date) : new Date();
      const from = new Date(day);
      from.setHours(0, 0, 0, 0);
      const to = new Date(day);
      to.setHours(23, 59, 59, 999);
      const schedule = await getSchedule(userId, wid, { from, to });
      return JSON.stringify(schedule.items.map((i) => ({
        kind: i.kind, title: i.title,
        start: i.start, end: i.end, allDay: i.allDay,
      })));
    },
    {
      name: "get_daily_schedule",
      description: "Merged events + task deadlines for one day (ISO date, defaults today).",
      schema: z.object({ date: isoDate.optional() }),
    },
  );

  const plan_day = tool(
    async ({ date }) => {
      const { previewPlan } = await import("@/src/services/planner.service");
      const plan = await previewPlan(userId, wid, date ? new Date(date) : new Date());
      return JSON.stringify({
        date: plan.date,
        blocks: plan.blocks.map((b) => ({
          name: b.name,
          items: b.items.map((i) => ({
            taskId: i.taskId,
            title: i.title,
            start: i.start,
            durationMin: i.durationMin,
            reason: i.reason,
          })),
        })),
        unscheduled: plan.unscheduled,
      });
    },
    {
      name: "plan_day",
      description:
        "Build a Morning/Afternoon/Evening plan from overdue, priority, deadlines, durations, events, and goals. Present it first — applying needs explicit user confirmation via the planner UI.",
      schema: z.object({ date: isoDate.optional().describe("ISO date, defaults to today") }),
    },
  );

  const plan_week = tool(
    async ({ date }) => {
      const { previewWeek } = await import("@/src/services/planner.service");
      const plan = await previewWeek(userId, wid, date ? new Date(date) : new Date());
      return JSON.stringify({
        weekStart: plan.weekStart,
        capacityPerDay: plan.capacityPerDay,
        days: plan.days.map((d) => ({
          weekday: d.weekday,
          date: d.date,
          items: d.blocks.flatMap((b) =>
            b.items.map((i) => ({
              taskId: i.taskId,
              title: i.title,
              block: b.name,
              start: i.start,
              durationMin: i.durationMin,
              reason: i.reason,
            })),
          ),
        })),
        unscheduled: plan.unscheduled,
        summary: plan.summary,
      });
    },
    {
      name: "plan_week",
      description:
        "Build a Monday–Sunday plan from incomplete tasks, projects, goals, deadlines, events, and recent productivity. Present it first — applying needs explicit user confirmation via the planner UI.",
      schema: z.object({ date: isoDate.optional().describe("ISO date within the target week") }),
    },
  );

  const analyze_project_dependencies = tool(
    async ({ projectId }) => {
      const { suggestProjectDependencies } = await import("@/src/services/dependency-suggestion.service");
      const suggestions = await suggestProjectDependencies({ userId, workspaceId: wid, projectId });
      // Never auto-modify DB — return structured suggestions only
      return JSON.stringify({
        suggestions: suggestions.map((s) => ({
          sourceTaskId: s.sourceTaskId,
          targetTaskId: s.targetTaskId,
          reason: s.reason,
          confidence: s.confidence,
        })),
        note: "Suggestions require explicit user Accept — not yet saved.",
      });
    },
    {
      name: "analyze_project_dependencies",
      description:
        'Analyze project dependencies: inspect tasks, projects, goals, existing dependencies, descriptions, dates, durations and suggest missing dependencies. Example: "Build Product UI" may depend on "Build Product API". Returns {sourceTaskId,targetTaskId,reason,confidence} without modifying DB.',
      schema: z.object({ projectId: z.string().optional().describe("Project to analyze; omit for workspace-wide") }),
    },
  );

  const all = [
    create_note, update_note, search_notes,
    create_task, update_task, complete_task, list_tasks,
    create_event, update_event, delete_event,
    create_project, get_project,
    create_goal, update_goal,
    create_reminder,
    search_content, semantic_search,
    get_daily_schedule, get_productivity_stats,
    plan_day, plan_week,
    analyze_project_dependencies,
    // Extras beyond the core set:
    reopen_task, list_events, list_projects,
  ];
  if (!opts.allowlist) return all;
  const allowed = new Set(opts.allowlist);
  // Unknown names are dropped (validation rejects them at write time;
  // this is belt-and-braces for hand-rolled callers).
  return all.filter((t) => allowed.has(t.name));
}

export type NotoAITools = ReturnType<typeof makeTools>;
