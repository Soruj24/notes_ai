# Dependency Graph Architecture — NotoAI Production Design

> Status: **DESIGN ONLY — no code modified**. Based on repository inspection at `D:\Notes\my-app` on 2026-05-11. Package.json `my-app@0.1.0` with `next@16.3.4`, `react@19.2.8`, `mongoose@9.9.5`, `@langchain/langgraph@1.4.14` + `deepagents@1.13.3`, `@reduxjs/toolkit@2.12.0`.
>
> Goal: Safely add **task dependencies, project dependencies, dependency graph, blocked detection, circular detection, critical path, AI dependency suggestions** without regressions.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Inventory](#2-current-architecture-inventory)
3. [Gap Analysis](#3-gap-analysis)
4. [Target Data Model](#4-target-data-model)
5. [Database & Index Design](#5-database--index-design)
6. [Validation & Domain Rules](#6-validation--domain-rules)
7. [Repository Layer](#7-repository-layer)
8. [Service Layer](#8-service-layer)
9. [API Architecture](#9-api-architecture)
10. [Graph Algorithms (Pure Library)](#10-graph-algorithms-pure-library)
11. [AI & LangGraph Integration](#11-ai--langgraph-integration)
12. [State Management (RTK Query)](#12-state-management-rtk-query)
13. [Routing & Pages](#13-routing--pages)
14. [Visualization Components](#14-visualization-components)
15. [Security, RBAC, Workspace Isolation](#15-security-rbac-workspace-isolation)
16. [Migration & Rollout](#16-migration--rollout)
17. [Testing Strategy](#17-testing-strategy)
18. [Observability & Ops](#18-observability--ops)
19. [Alternatives Considered](#19-alternatives-considered)
20. [Implementation Phases & File Map](#20-implementation-phases--file-map)

---

## 1. Executive Summary

### Safest Insertion Strategy

NotoAI is **workspace-isolated, service-backed, thin-route** architecture. The safest path is **additive, non-breaking**:

- No existing field removed/renamed; only new optional fields (`blockedBy`, `blocks` derived, `projectBlockedBy`) + one new collection/embedded type (`TaskDependency` / `ProjectDependency` or simple `ObjectId[]`).
- Graph logic lives in a **new pure library** `src/lib/graph/` (zero DB, zero I/O) — unit-tested, reused by repositories (cycle guard), services, API, and planner.
- Writes are **guarded at repository** (membership + `requireWritableMembership` + cycle check) and validated by **pure zod validators** in `src/lib/validation/`.
- Reads are **derived** (critical path, blocked status, topological order) computed on demand, cached via RTK Query tags.
- AI is **suggest-only** (like `note-intelligence.ts:6-9`): new tools return suggestions, never auto-mutate dependencies without user confirmation.
- Visualization is **greenfield** `@xyflow/react` (React Flow) isolated to a new route `app/(app)/graph/` and embeddable overlays in Tasks/Projects — no touch to `DailyChart`, `BarChart`, or `ProgressRing`.

This preserves the existing hierarchy `Goal → Project → Task` (`project.model.ts:12`, `task.model.ts:32-33`) while introducing a lateral **DAG overlay** scoped strictly to `workspaceId`.

### What Will Exist After

- Tasks can declare `blockedBy: Task[]` (finish-to-start default, extensible to `type`).
- Projects can declare `blockedByProject: Project[]` (coarse-grained phase ordering).
- `GET /api/workspaces/[wid]/tasks/graph` and `projects/graph` return `{nodes, edges, blocked, cycles, criticalPath}`.
- Any create/update that would introduce a cycle **fails with 400 `{errors:{blockedBy:["Circular dependency detected"]}}`** — never persisted.
- Blocked tasks are visually distinct and excluded/skipped by `buildDayPlan`/`buildWeekPlan` (`scheduler.ts:8-302`) unless user overrides.
- AI tool `suggest_dependencies` proposes links via semantic similarity + title heuristics, ranked.

---

## 2. Current Architecture Inventory

### 2.1 Models & DB — `src/models/*.model.ts`, `src/lib/db/connection.ts:1`, `src/lib/db/enums.ts:1`

| Model | File | Key Fields | Workspace Scoping | Existing Indexes |
|---|---|---|---|---|
| **Task** | `task.model.ts:20-40` `taskSchema:44-64` | `workspaceId*, ownerId*, title, notes, status enum todo/in_progress/done/archived, priority, startAt, dueAt, durationMin 0-10080, completedAt, projectId?, goalId?, tags[], subtasks[] {done,completedAt}, recurrence, recurrenceUntil` | `workspaceId index:true:46`, queried only via `member.workspaceId` (`task.repository.ts:122`) | `66: {ws, status, dueAt}`, `67: {ws, projectId}`, `68:{ws,goalId}`, `69:{ws,updatedAt}`, `71:{createdAt}`, `72:{completedAt}` |
| **Project** | `project.model.ts:4-16` `projectSchema:20-32` | `workspaceId*, ownerId*, name, description, status active/on_hold/completed/archived, color, dueAt, goalId?` | Same gate (`project.repository.ts:47`) | `34:{ws,status,updatedAt}`, `35:{ws,goalId}` |
| **Goal** | `goal.model.ts:22-38` `goalSchema:42-55` | `workspaceId*, ownerId*, title, status, frequency, targetDate, progress 0-100, milestones[]` | Same (`goal.repository.ts:67`) | `57:{ws,status,targetDate}` |
| **Workspace / Member** | `workspace.model.ts:4-16`, `workspace-member.model.ts:4-10` | `ownerId, status ACTIVE/SUSPENDED/ARCHIVED/DELETED` (`enums.ts:13`), `role owner/admin/member/viewer` (`enums.ts:3`) | Central gate `base.ts:45-73` `requireMembership`/`requireWritableMembership` | `workspace: {ownerId, status}`, `member: {ws,user} unique` |

**DB Plumbing:** `connection.ts:8-50` — `mongodb://127.0.0.1:27017/notoai` fallback, `globalThis.__notoaiMongoose:19-28` HMR-safe cached promise, `serverSelectionTimeoutMS 8000`, `maxPoolSize 10`, `applyJsonTransform:7-17` drops `__v`, maps `_id→id`. Every repository calls `connectDb()` first; components never do.

**No dependency fields exist.** `grep dependency` returns zero hits. Relations are only hierarchical: `task.projectId`, `task.goalId`, `project.goalId` (`project.model.ts:12`). No graph code: `grep StateGraph/Annotation` zero; `glob **/*graph*` zero.

### 2.2 API Architecture

Thin handler pattern (`app/api/**/**/route.ts` → `requireApiUser` → `parseJsonBody` → `validate*` → Service → Repository → Model → `toApiError`):

- Workspace-scoped roots: `app/api/workspaces/[wid]/tasks/route.ts:27` (`GET ?view/status/priority/projectId/goalId/tagId/query`, `POST`), `tasks/[id]/route.ts:11` (`GET/PATCH/DELETE`), `tasks/[id]/complete:10`, `tasks/[id]/subtasks`, `tasks/counts:10`, `projects/route.ts:10`, `projects/[pid]/route.ts:14`, `goals/route.ts:10` etc.
- Auth: `request.ts:11` `requireApiUser(req)` wraps `verifyRequestSession` (`auth/session.ts:24`), `provisioned `401`/`503` during maintenance; every workspace route starts with it (`tasks/route.ts:28`).
- Validation: pure modules `src/lib/validation/tasks.ts:1` (`validateTaskCreate:53`, `validateTaskUpdate:122`, `fail/pass:9-14`, `asDate:23`, `asEnum:29`), shared `workspaces.ts:24`, inline for projects/goals (`projects/route.ts:51`).
- Services: `task.service.ts:1` delegates + `requireFlag("tasks")`, `publishDomainEvent`, `logActivity`, recurrence spawn (`completeUserTask:125-184`).
- Errors: `errors.ts:3` `NotFoundError 404`, `ForbiddenError 403`, `ConflictError 409`, `ValidationError 400`, `toHttpError:45-58` / `toApiError:66`.
- Admin dual prefix: `app/api/admin/*` + `app/api/v1/admin/*` → `src/controllers/admin/*.controller.ts` via `authorizeAdmin` (`api/admin.ts:152`).

### 2.3 AI Architecture

**Not a StateGraph app:** `package.json:14` has `@langchain/langgraph@1.4.14` but `src/lib/ai/agent.ts:2` uses `createAgent from "langchain"` + `deepagents@1.13.3`; no `StateGraph/Annotation` wiring.

- **Provider:** `src/lib/ai/providers.ts:88-172` `OpenAICompatibleAdapter` (Ollama `/api/tags` + OpenAI `/v1/models`), `getAdapter:175`, `resolveChatModel:199-263` with fallback+ping (1500ms).
- **Config layered:** `src/lib/ai/config.ts:12-162` env + `system_settings` (`listSettings("ai")`), `overlay:82-144`; `isAIEnabled:165`.
- **Registry:** `src/lib/ai/settings.ts:25-420` 14 keys, `TOOL_NAMES:30-56` 25 fixed names; `validateAISettingValue` strict, `isSafeModelName`.
- **Tools:** `src/lib/ai/tools.ts:15-641` `makeTools(ctx:{userId,workspaceId}:20, opts.allowlist)` 25 tools, each `tool(async (args)=> service call, {name, description, schema: z.object})`; workspace-scoped, zod-validated, never direct Mongo. Examples: `list_tasks:103-125`, `create_task:127-151`, `plan_day:563-588` (via `previewPlan`), `plan_week:590-621`.
- **Agent:** `src/lib/ai/agent.ts:31-59` `createAgent(ctx)` resolves config+model+tools per turn, `toLangChainMessages:23-29`, `createLangChainAgent({model,tools,systemPrompt})`.
- **Streaming:** `app/api/workspaces/[wid]/ai/command/route.ts:88-329` SSE `ReadableStream`, burst 20/min, per-model daily limits, `recursionLimit`/`timeoutMs`, `chunkText:36-47`/`chunkToolCalls:49-55`.
- **Completions:** `src/lib/ai/complete.ts:4-59` `completeText`/`completeJson` (temperature 0.2, maxTokens 500).
- **Note Intelligence suggest-only:** `app/api/workspaces/[wid]/notes/[id]/ai/route.ts:22-92` → `note-intelligence.ts:11` (`summarize/rewrite/extract_tasks`... via `completeText`), never mutates.
- **Vectors:** `src/lib/ai/chunk.ts:11-58` (TARGET 800, OVERLAP 120), `rank.ts:1-55` (title×3), `embeddings.ts:31-120` (`HashEmbeddingProvider` 512d vs `OllamaEmbeddingProvider` 1536d), `mongo-store.ts:16-99` brute-force cosine, `semantic.service.ts:47-183` `indexEntity/indexWorkspace/semanticSearch`.

### 2.4 LangGraph

Installed but **transitive**. No workflow graph exists. The insertion point for dependency reasoning is **either** `deepagents` delegation (simple) or a **new `StateGraph` sub-graph** under `src/lib/ai/workflows/dependency-graph.ts` (advanced) with checkpointer—covered in §11.

### 2.5 State Management

Single `makeStore()` (`store.ts:12-34`) with 7 RTK Query APIs + 1 UI slice:

- `tasksApi:30-191` (`reducerPath tasksApi`, `tagTypes TaskLists/TaskCounts/Task`, `fetchBaseQuery /api:31`, `providesTags` lists, `invalidatesTags` + `onQueryStarted` cross-invalidates `scheduleApi`+`analyticsApi:63-71`).
- `scheduleApi:15`, `notesApi:11`, `dashboardApi:38`, `notificationsApi:21` (15s poll), `remindersApi:22`, `analyticsApi:21`; `tasksUiSlice:15-29` (`sort: TaskSort due/priority/updated`, `search`).
- Projects/Goals use local `useState` filters (`ProjectsExplorer:49-50`, `GoalsExplorer:29-31`), not Redux.

### 2.6 Existing Graph/Workflow & Visualization

**None.** `package.json:12-28` has no `d3/recharts/visx/xyflow/react-flow`; `grep graph/chart/dag/flow` hits only `overflow`, `BarChart` class names. Visuals are CSS-only:

- `src/components/analytics/DailyChart.tsx:9-104` (`Today/Week/Month` toggles, `div flex items-end gap-1`, `height ${value/max*128}px`),
- `src/components/admin/dashboard/BarChart.tsx:18-51` (`flex h-28 items-end`),
- `src/components/ui/progress.tsx:14-96` (`ProgressBar`/`ProgressRing` SVG `size44`, `strokeDashoffset`).

### 2.7 Routing

Workspace group `app/(app)/layout.tsx:12-36` `WorkspaceLayout` via `getCurrentUser`+`getMaintenanceState`+`getSettingValue`, guard; `app/(app)/tasks/layout.tsx:7-24` persistent `TasksSidebar` (SSR counts `countUserTasks:13`) + `TasksViewTabs`.

- Tasks: `app/(app)/tasks/{page, today, upcoming, overdue, completed, [id]/page}` via `TasksPage wid view` (`tasks/types.ts:3`).
- Projects: `app/(app)/projects/page.tsx:9-21` `listProjectsWithProgress + listUserGoals → ProjectsExplorer`, `[id]/page:14-28` `getProjectDetail → ProjectDetail`.
- Goals: same pattern.
- Planner: `app/(app)/planner/page.tsx:12-27` `searchParams date/view` → `PlannerView` → `DayPlanner`/`WeekPlanner` via `scheduler.ts:128-301`.
- Calendar: `src/lib/calendar-page.ts:6-21` `getCalendarContext`, `app/(app)/calendar/{day,week,month,agenda}`, `CalendarPage.tsx:97-265` RTK `scheduleApi`.

### 2.8 Database Architecture

Already in §2.1. Key invariants: **every read/write is workspace-isolated** (`requireMembership:45-60` checks `WorkspaceMember` + `readWorkspaceStatus` blocks `SUSPENDED/DELETED`, `requireWritableMembership:63-73` blocks `ARCHIVED`; `assertCanWrite:91-102` respects `viewer`/`elevated` vs owner). Feature flags via `requireFlag` (`evaluation.ts:111`) fail-open. No transactions; compensated deletes on workspace creation (`workspace.repository.ts:70`).

---

## 3. Gap Analysis

| Required Capability | Current State | Gap | Risk If Naïve |
|---|---|---|---|
| **Task dependencies** (task A blocks B) | No field, no index, no validation | Need new array + type + indexes + cycle guard | Cycle could freeze planner/scheduler |
| **Project dependencies** (phase ordering) | Only `project.goalId` hierarchy | Similar field for Project | Missing if projects remain unordered |
| **Dependency graph** (nodes/edges payload) | No graph endpoint/library | Need derived graph builder + API | Ad-hoc traversal scattered in components |
| **Blocked detection** (transitive) | `TASK_STATUSES` alone, no blocked concept | Need blocked resolver (status + upstream done?) | Incomplete UX (shows todo that can't start) |
| **Circular detection** | None | Need DFS/Kahn at write time + diagnostic endpoint | Infinite loop in critical path/topological sort |
| **Critical path** (longest path by duration) | `durationMin` exists but unused by planner | Need DAG longest-path using `durationMin` + fallback | Misleading timeline if project dueAt ignored |
| **AI suggestions** | Tools registry fixed (25); no dependency tool | Need new tools + optional sub-graph | Hallucinated links if semantic unconstrained |

**Cross-cutting gaps:** No migration story, no visualization lib, no RTK slice for graph, no planner integration.

---

## 4. Target Data Model

### 4.1 Design Principle: Additive, Workspace-Scoped, Typed

- New fields are **optional arrays** defaulting to `[]`, so existing documents read as acyclic without migration.
- Store **edges outgoing from the dependent**: `task.blockedBy: ObjectId[]` means "this task cannot start until each `blockedBy` is done". This matches "blocked task detection" (if any upstream not `done`, task is blocked) and avoids two-way sync bugs. Alternative `dependsOn` naming is equivalent; pick one and provide virtual `blocks` via reverse query.
- Dependency **type** is additive later; MVP uses `finish_to_start` semantics (upstream `done` unblocks downstream). Extensible enum reserves `start_to_start`, `finish_to_finish`, `relates_to` without schema break.

### 4.2 Task Schema Extension — `src/models/task.model.ts:44-64`

```ts
// New enums in src/lib/db/enums.ts:1
export const TASK_DEPENDENCY_TYPES = ["finish_to_start", "start_to_start", "relates_to"] as const;
export type TaskDependencyType = typeof TASK_DEPENDENCY_TYPES[number];

export interface TaskDependency {
  taskId: Types.ObjectId;          // ref Task
  type: TaskDependencyType;        // default finish_to_start
  createdAt: Date;
}

const taskDependencySchema = new Schema<TaskDependency>({
  taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  type:   { type: String, enum: TASK_DEPENDENCY_TYPES, default: "finish_to_start", required: true },
  createdAt: { type: Date, default: () => new Date() },
}, { _id: false });

// Extend TaskDoc:20-40
blockedBy: TaskDependency[];       // tasks this one depends on
// Optional denormalized reverse (maintenance-risk): prefer virtual via query
// blocks: not stored; derived as "who depends on me"

const taskSchema = new Schema<TaskDoc>({
  // ...existing 44-64
  blockedBy: { type: [taskDependencySchema], default: [] },
  // project linkage remains projectId/goalId
}, { timestamps: true });

// Indexes (see §5)
taskSchema.index({ workspaceId: 1, "blockedBy.taskId": 1 });
taskSchema.index({ workspaceId: 1, status: 1, "blockedBy.taskId": 1 });
```

**Alternative minimal** (if team prefers no sub-schema overhead, matches `tags: [ObjectId]` pattern `task.model.ts:58`):

```ts
blockedBy: [{ type: Schema.Types.ObjectId, ref: "Task" }]  // ObjectId[] only
```

Minimal wins for `package.json` weight (no new deps), but loses `type`. Recommendation: **sub-schema from day one** — the `type` gate avoids future double migration.

**DTO extension — `src/components/tasks/types.ts:12-32`, `src/repositories/task.repository.ts:22-42`:**

```ts
export interface TaskDependencyDTO { id: string; type: TaskDependencyType; title: string; status: TaskStatus; }
export type TaskDTO = { /* existing 12-32 */ blockedBy: TaskDependencyDTO[]; blocked: boolean; blocking: string[]; }
export type TaskRecord = { /* existing */ blockedBy: Array<{id:string; type:TaskDependencyType}>; }
```

`blocked` and `blocking` are **derived**, never persisted. `blocking` (reverse edges) is computed via `Task.find({ workspaceId, "blockedBy.taskId": id })`.

### 4.3 Project Schema Extension — `src/models/project.model.ts:4-16`

Same pattern, coarser granularity:

```ts
export const PROJECT_DEPENDENCY_TYPES = ["finish_to_start", "relates_to"] as const;

export interface ProjectDependency { projectId: Types.ObjectId; type: ...; createdAt: Date; }

const projectDependencySchema = new Schema<ProjectDependency>({ ... });

export interface ProjectDoc {
  // existing 4-16
  blockedBy: ProjectDependency[];  // projects this one depends on
}

projectSchema:20-32 add:
  blockedBy: { type: [projectDependencySchema], default: [] }

Index: { workspaceId: 1, "blockedBy.projectId": 1 }
```

Use case: `Project A (Design) blocks Project B (Build)`. Tasks inside projects inherit indirect blocking via `project.blockedBy` (resolved transitively in graph builder).

### 4.4 Goal Hierarchy — Unchanged

`goal.model.ts:22-38` remains top. Goal dependencies are out-of-scope for MVP (Goal → Project → Task tree already covers). If needed later, same sub-schema applies.

### 4.5 Edge Collection vs. Embedded Array Trade-off

| Strategy | Pros | Cons | Verdict |
|---|---|---|---|
| **Embedded `blockedBy[]` (recommended)** | Single read per task, workspace-scoped query trivial, no new collection, atomic update via `$addToSet/$pull` | Reverse query needs index scan; large arrays (<100 edges/task rare) unbounded | **Choose for MVP**: matches `subtasks/tags` pattern, simplest migration |
| Separate `TaskDependency` collection `{workspaceId, from, to, type}` | Unlimited scale, indexed both directions, easier graph analytics | Extra collection, joins, consistency complexity | Reserve for scale >10k edges/workspace |

---

## 5. Database & Index Design

### 5.1 New Indexes (Mongoose `schema.index`)

```ts
// Tasks
taskSchema.index({ workspaceId: 1, "blockedBy.taskId": 1 });          // reverse lookup + validation
taskSchema.index({ workspaceId: 1, status: 1, "blockedBy.taskId": 1 }); // blocked filter
taskSchema.index({ workspaceId: 1, projectId: 1, "blockedBy.taskId": 1 }); // project-scoped graph

// Projects
projectSchema.index({ workspaceId: 1, "blockedBy.projectId": 1 });

// Optional compound for graph fetch (full workspace graph in one query)
taskSchema.index({ workspaceId: 1, updatedAt: -1 }); // already 69, reused
```

All queries include `workspaceId` first (workspace isolation invariant `task.repository.ts:122`).

### 5.2 Constraints

- `blockedBy` max length **50** per task/project (guard in validation, prevents unbounded arrays and DoS).
- `blockedBy.taskId` must pass `oid()` (`base.ts:31-36`) and existence check `Task.findOne({_id, workspaceId})`; otherwise `NotFoundError 404` / `ValidationError 400`.
- Self-dependency `taskId === _id` rejected (cycle length 1).
- Duplicate edges deduped via `$addToSet`-equivalent in service (by `taskId`).

### 5.3 Migration

No migration required: new field defaults to `[]`, existing docs read cleanly. Optional `updateMany` to set `blockedBy: []` for explicitness, but `lean()` mapping in `task.repository.ts:74-96` should default `blockedBy ?? []`.

If `durationMin` missing, critical-path fallback uses `30 * priorityWeight` (see §10).

---

## 6. Validation & Domain Rules

New pure module `src/lib/validation/dependencies.ts` mirroring `validation/tasks.ts:9-14` signature `pass/fail`:

```ts
export function validateDependencyAdd(input: { blockedBy: unknown }): ValidationResult<{blockedBy: string[]}> 
  // checks array max 50, each oid valid, no self, no duplicate

export function validateDependencyUpdate(input: { add?: string[]; remove?: string[]; set?: string[] })
  // set replaces all (used by PATCH /graph), add/remove incremental

export function validateProjectDependencyAdd(...)

export function assertNotSelf(taskId:string, deps:string[])
```

Rules:

- `blockedBy` elements must be **existing tasks in same workspace** (`requireMembership` already gates workspace).
- Circular check is **not in validator** (requires DB read of transitive closure) — done in repository/service transaction before write, returning `ValidationError 400 {blockedBy:["Circular dependency detected: A→B→C→A"]}`.
- Status transition guard: completing a task does **not** auto-complete downstream; it **unblocks** them (derived). Optionally, an additional guard `complete` could succeed but UI warns "3 dependent tasks now unblocked".
- `durationMin` validated already `validation/tasks.ts:76-82` (`0-10080`), reused for critical path weighting.

Error shape consistent with `tasks/route.ts:49` `{errors:{blockedBy:[]}}` 400, `403` for `viewer`, `404` for workspace/task not found.

---

## 7. Repository Layer

### 7.1 Task Dependency Repository Methods — `src/repositories/task.repository.ts:113-340`

Add alongside `listTasks/getTask/createTask/updateTask/deleteTask`:

```ts
export interface DependencyOptions { maxDepth?: number; includeCompleted?: boolean; }

export async function getTaskGraph(userId:string, workspaceId:string, opts?: DependencyOptions): Promise<{
  nodes: TaskRecord[]; edges: Array<{from:string; to:string; type:string}>; blocked: Record<string,boolean>; cycle: string[]|null;
}>

export async function addTaskDependencies(userId:string, workspaceId:string, taskId:string, depIds:string[], type?: TaskDependencyType): Promise<TaskRecord>

export async function removeTaskDependencies(userId:string, workspaceId:string, taskId:string, depIds:string[]): Promise<TaskRecord>

export async function setTaskDependencies(userId:string, workspaceId:string, taskId:string, depIds:string[]): Promise<TaskRecord>

export async function getBlockedTasks(userId:string, workspaceId:string): Promise<TaskRecord[]>

export async function detectCycle(userId:string, workspaceId:string, hypotheticalEdge?: {from:string; to:string}): Promise<string[]|null>
```

**Implementation template** (every method starts with gating, mirrors `listTasks:119-120`, `createTask:186`):

```ts
export async function addTaskDependencies(userId, workspaceId, taskId, depIds, type="finish_to_start") {
  const member = await requireWritableMembership(userId, workspaceId);
  if (member.role === "viewer") throw new ForbiddenError("Viewers cannot modify content.");
  await db();
  const task = await Task.findOne({_id: oid(taskId,"taskId"), workspaceId: member.workspaceId});
  if (!task) throw new NotFoundError("Task not found.");
  assertCanWrite(member, task.ownerId); // base.ts:91
  // existence + workspace match for each dep
  for (const id of depIds) {
    if (id === taskId) throw new ValidationError({blockedBy:["Task cannot depend on itself."]});
    const dep = await Task.findOne({_id: oid(id,"taskId"), workspaceId: member.workspaceId}).select({_id:1}).lean();
    if (!dep) throw new NotFoundError(`Dependency ${id} not found.`);
  }
  // merge + dedupe + cap 50
  const merged = [...new Set([...task.blockedBy.map(b=>String(b.taskId)), ...depIds])];
  if (merged.length>50) throw new ValidationError({blockedBy:["Too many dependencies (max 50)."]});
  // cycle check before save - load full workspace adjacency
  const cycle = await hasCycle(member.workspaceId, merged, newEdge(taskId, depIds));
  if (cycle) throw new ValidationError({blockedBy:[`Circular dependency: ${cycle.join(" → ")}`]});
  // persist
  task.blockedBy = merged.map(id=>({taskId: oid(id), type, createdAt:new Date()}));
  await task.save();
  return toRecord(task.toObject() as any);
}
```

`hasCycle` is pure library call (§10) over `Map<id, string[]>` built from single `Task.find({workspaceId}).select({blockedBy:1}).lean()`.

`getTaskGraph` loads all tasks in workspace (`find({workspaceId:member.workspaceId}).lean()`), maps to `nodes/edges`, computes `blocked` via `isBlocked` (§10), `criticalPath` via `computeCriticalPath`, `cycle` via `detectCycle`. Pagination not applied to graph (graph needs full context; list endpoint remains paginated via `clampLimit`).

Analogous methods in `src/repositories/project.repository.ts:42-144` for `addProjectDependencies` etc., plus `getProjectGraph`.

**Workspace isolation invariant:** Every `findOne` includes `workspaceId: member.workspaceId` (never raw param), same as `getTask:163-165`.

### 7.2 Publisher & Activity

Mirror `task.service.ts:66-78`: on dependency mutation publish `task.dependency.added/removed` + `logActivity:72-78` with `metadata:{added:[ids], cycleCheck:"ok"}`.

---

## 8. Service Layer

New methods in `src/services/task.service.ts:22-230` wrapping repos + `requireFlag`:

```ts
export async function addUserTaskDependencies(userId, workspaceId, taskId, depIds, type?) {
  await requireFlag("tasks", userId); // consistent with listUserTasks:28
  const record = await addTaskDependencies(userId, workspaceId, taskId, depIds, type);
  publishDomainEvent("task.dependency.added", {workspaceId, actorId:userId, entityId:taskId});
  await logActivity({workspaceId, actorId:userId, action:"updated", entityType:"task", entityId:taskId, metadata:{depAdded:depIds}});
  return record;
}
```

Project counterpart `src/services/project.service.ts:28`.

**No breaking change to `createUserTask`/`updateUserTask`** — dependency field is handled by separate methods/endpoint to avoid bloating existing validators. Optionally, `createUserTask` accepts `blockedBy?: string[]` (validated alongside) for single-shot creation, but isolated endpoint is safer for cycle diagnostics.

---

## 9. API Architecture

### 9.1 Routes (App Router `app/api/workspaces/[wid]/`)

**Additive, not replacing:**

| Method | Path | File | Auth/Guard | Body/Query | Success | Error |
|---|---|---|---|---|---|---|
| `POST` | `/api/workspaces/[wid]/tasks/[id]/dependencies` | `tasks/[id]/dependencies/route.ts` | `requireApiUser` + `requireWritableMembership` | `{add:[id], type?}` | `200 {task, blocked}` | `400 cycle`, `403 viewer`, `404 task` |
| `DELETE` | `/api/workspaces/[wid]/tasks/[id]/dependencies` | same | same | `{remove:[id]}` | `200 {task}` | |
| `PUT` | `/api/workspaces/[wid]/tasks/[id]/dependencies` | same | same | `{blockedBy:[id]}` replaces | `200 {task}` | `400 too many` |
| `GET` | `/api/workspaces/[wid]/tasks/graph` | `tasks/graph/route.ts` | `requireApiUser` + `requireMembership` | `?includeCompleted=0&projectId=` | `200 {nodes, edges, blocked, cycle, criticalPath}` | |
| `GET` | `/api/workspaces/[wid]/tasks/[id]/blocked` | `tasks/[id]/blocked/route.ts` | same | — | `200 {blocked, blocking, reasons}` | |
| `POST` | `/api/workspaces/[wid]/projects/[id]/dependencies` | `projects/[id]/dependencies/route.ts` | same | `{add:[id]}` | `200 {project}` | |
| `GET` | `/api/workspaces/[wid]/projects/graph` | `projects/graph/route.ts` | same | `?status=` | `200 {nodes,edges}` | |

**Thin handler template** (`tasks/route.ts:27-59` pattern):

```ts
// app/api/workspaces/[wid]/tasks/[id]/dependencies/route.ts
interface Params { params: Promise<{wid:string; id:string}> }
export async function POST(req: NextRequest, {params}: Params) {
  const {wid, id} = await params;
  const user = await requireApiUser(req); if (user instanceof NextResponse) return user;
  const body = await parseJsonBody(req); if (body instanceof NextResponse) return body;
  const result = validateDependencyAdd(body.body); if (!result.ok) return NextResponse.json({errors:result.errors},{status:400});
  try { const task = await addUserTaskDependencies(user.id, wid, id, result.data.blockedBy, result.data.type); return NextResponse.json({task}); }
  catch (err){ return toApiError(err); }
}
```

**Query clamping** mirrors `workspaces.ts:33` (`limit 1-100`), graph endpoint does not paginate but respects `projectId` filter narrowing to subgraph (tasks where `projectId` in selected projects or connected via edges).

**Admin endpoints** unchanged; dependency writes remain user-workspace-scoped, not platform admin. Admin overview can expose aggregate cycle count via `analytics.service`.

### 9.2 Request/Response Shapes (shared `src/types/dependency.ts` or inline)

```ts
export interface TaskGraphDTO {
  nodes: Array<TaskDTO & {blocked:boolean; depth:number}>;
  edges: Array<{from:string; to:string; type:TaskDependencyType}>;
  blocked: Record<string, {blocked:boolean; blockedBy:string[]; reason:string}>;
  cycle: string[] | null;          // null if acyclic, otherwise cycle path ids
  criticalPath: string[];          // ordered ids along longest path
  stats: { total:number; blockedCount:number; edgeCount:number; estimatedCriticalDays:number };
}
```

Errors reuse `{error}` / `{errors}` union from `request.ts:47-57`.

---

## 10. Graph Algorithms (Pure Library)

New folder `src/lib/graph/` with zero DB/I/O, fully unit-testable (mirrors `scheduling/range.ts:5-83` and `planning/scheduler.ts:8-302` style):

### 10.1 `src/lib/graph/dag.ts`

```ts
export type Adj = Map<string, string[]>; // node -> blockedBy neighbors (edges to dependencies)
export function buildAdj(tasks: Array<{id:string; blockedBy:Array<{id:string}>}>): Adj;
export function reverseAdj(adj: Adj): Map<string,string[]>; // who depends on me
export function detectCycle(adj: Adj): string[]|null; // DFS with recursion stack, returns cycle path or null
export function topologicalSort(adj: Adj): string[]|null; // Kahn's, null if cycle
export function isBlocked(id:string, adj: Adj, done: Set<string>): boolean; // transitive check
export function transitiveBlockedIds(id:string, adj:Adj, done:Set<string>): string[]; // all upstream blocking
export function blockedClosure(adj: Adj, done:Set<string>): Map<string, boolean>;
```

- **Cycle:** DFS `visited: Set`, `stack: Set`, `path: string[]`; on hitting `stack.has(n)` return cycle slice. Complexity `O(V+E)`.
- **Blocked:** If any `blockedBy` neighbor not in `done` OR that neighbor itself blocked, then blocked. Memoized DFS to avoid exponential.

### 10.2 `src/lib/graph/critical-path.ts`

```ts
export function computeCriticalPath(
  adj: Adj,
  nodes: Map<string,{durationMin?:number; dueAt?:Date}>,
  topOrder: string[] // from topologicalSort
): {path:string[]; totalMin:number; totalDays:number}
```

- Longest path in DAG by `durationMin` weight, fallback `durationMin ?? priorityWeight(priority) * DEFAULT_DURATION (30)`. If `durationMin` absent, `urgent 4 > high 3 > medium 2 > low 1` mapping (mirrors `tasks/types.ts:55-59` rank).
- Topological order then DP: `dist[v]= weight(v) + max_{u→v} dist[u]`, `prev[v]` for reconstruction.
- Also computes `estimatedCriticalDays = ceil(totalMin / (workMinutesPerDay 480))` for UI.

### 10.3 `src/lib/graph/project-graph.ts`

Projects are coarser; reuse same `dag.ts` but nodes are projects, edges from `project.blockedBy`. Combined graph optionally merges tasks+projects: tasks inherit project blocking transitively when rendering.

### 10.4 Integration Points

- **Repository cycle guard:** before `task.save()` call `detectCycle(buildAdj(allTasksPlusHypothetical))`.
- **Planner:** `buildDayPlan:96-104` sort key augmented: blocked tasks sorted last, optionally filtered unless user toggles "include blocked". `buildWeekPlan:253-301` similar.
- **Calendar:** `mergeSchedule:73-81` tasks contribute only if not blocked (configurable).
- No modification to `expand.ts:65-102` recurrence expansion; dependencies apply to concrete instances.

---

## 11. AI & LangGraph Integration

### 11.1 Suggest-Only Tools (like `note-intelligence.ts:71-205`)

Add to `TOOL_NAMES:30-56` and `makeTools:78-641`:

```ts
export const TOOL_NAMES = [ /* existing 25 */ "suggest_dependencies", "analyze_critical_path", "get_blocked_tasks", "get_dependency_graph" ] as const;

// inside makeTools(ctx, opts)
const suggest_dependencies = tool(
  async ({ taskId }) => {
    const graph = await getTaskGraph(userId, wid, {includeCompleted:false});
    const candidates = await rankDependencyCandidates(userId, wid, taskId, graph); // semantic + lexical
    return JSON.stringify(candidates.slice(0,8).map(c=>({id:c.id,title:c.title,score:c.score,reason:c.reason})));
  },
  { name:"suggest_dependencies", description:"Suggest tasks this one may depend on, ranked by semantic similarity and due proximity.", schema: z.object({taskId:z.string().min(1)}) }
);

const analyze_critical_path = tool(
  async ({ projectId }) => {
    const graph = await getTaskGraph(userId, wid, {projectId});
    const {path, totalMin} = computeCriticalPath(buildAdj(graph.nodes), ...);
    return JSON.stringify({path, totalMin});
  },
  { name:"analyze_critical_path", description:"Return critical path for a project or workspace.", schema: z.object({projectId:z.string().optional()}) }
);
```

Allowlist gating respects `settings.ts:297-306` (`ai.tools.allowlist` subset of `TOOL_NAMES`), so admin can toggle graph tools without code.

**Candidate ranking** (`src/lib/ai/dependency-suggest.ts` new):

- Signals: title/body embedding cosine (via `embeddings.ts:108-120` + `rank.ts:30-42`), shared `projectId`/`goalId`, `dueAt` proximity, lexical overlap (`rankHits`).
- Score `0-1`, filter `<0.25`, return top 8 with `reason: string` (e.g., "Shares project Build + similar title 'API auth'").

### 11.2 Optional LangGraph Sub-Workflow

Current `agent.ts:51-55` `createLangChainAgent({model,tools,systemPrompt})` is sufficient for tool routing. For richer reasoning (multi-step: fetch graph → detect cycle → propose reordering → ask confirmation), add optional `src/lib/ai/workflows/dependency-graph.ts` using `@langchain/langgraph`:

```ts
Annotation.Root({ taskId, workspaceId, graph: Annotation<Adj>, cycle, suggestions })
Nodes: fetchGraph -> detectCycle -> rankSuggestions -> draftAnswer
Edge: if cycle != null -> explainCycle else -> suggest
Checkpointer: in-memory per request (no persistence)
```

This is **opt-in**; if not installed, `suggest_dependencies` tool alone satisfies the requirement. Do not add checkpointer persistence without evaluating cost.

### 11.3 Prompts

Extend `src/lib/ai/prompts.ts:3-23` `buildSystemPrompt` with guidance:

- "When user says 'this depends on that', use `suggest_dependencies` then confirm."
- "Never auto-chain dependencies without explicit user confirmation (like `plan_day` pattern `tools.ts:584`)."
- "Explain circular errors with the cycle path, suggest which edge to remove."

---

## 12. State Management (RTK Query)

Add new API slice or extend `tasksApi:30-191`:

**Option A — New slice `src/store/dependencyGraphApi.ts` (preferred, isolation):**

```ts
export const dependencyGraphApi = createApi({
  reducerPath: "dependencyGraphApi",
  baseQuery: fetchBaseQuery({baseUrl:"/api"}),
  tagTypes: ["DependencyGraph","ProjectGraph"],
  endpoints: (build)=>({
    getTaskGraph: build.query<TaskGraphDTO, {wid:string; projectId?:string; includeCompleted?:boolean}>({
      query: ({wid,projectId,includeCompleted})=> {
        const p=new URLSearchParams(); if(projectId) p.set("projectId",projectId); if(includeCompleted) p.set("includeCompleted","1");
        return `/workspaces/${wid}/tasks/graph?${p.toString()}`; },
      providesTags: ["DependencyGraph"],
    }),
    getProjectGraph: build.query<ProjectGraphDTO, {wid:string}>({ query:({wid})=> `/workspaces/${wid}/projects/graph`, providesTags:["ProjectGraph"]}),
    addTaskDependencies: build.mutation<TaskDTO,{wid:string; taskId:string; add:string[]; type?:string}>({
      query:({wid,taskId,add,type})=> ({url:`/workspaces/${wid}/tasks/${taskId}/dependencies`, method:"POST", body:{add,type}}),
      invalidatesTags: ["DependencyGraph","TaskLists","TaskCounts"],
      onQueryStarted: async(_,api)=> api.dispatch(dependencyGraphApi.util.invalidateTags(["DependencyGraph"])),
    }),
    // remove/set symmetric
  }),
});
// Extend store.ts:15-33 with reducer & middleware
```

**Option B — Extend `tasksApi`** (`invalidatesTags: ["TaskLists","TaskCounts"]` already cross-invalidates `scheduleApi`+`analyticsApi:63-71`). Option B reduces slices but couples concerns; Option A is safer for tag invalidation and bundle splitting.

RTK cache `keepUnusedDataFor` default (60s) suffices; graph is lightweight `O(V+E)` JSON.

UI sync: after mutation `onQueryStarted:64-71` pattern invalidates `scheduleApi` because blocked status affects `mergeSchedule`.

---

## 13. Routing & Pages

### 13.1 New Workspace Graph Route

```
app/(app)/graph/page.tsx            -> GraphPage (workspace-wide DAG)
app/(app)/graph/layout.tsx          -> optional sub-nav (Tasks Graph | Projects Graph)
app/(app)/projects/[id]/graph/page.tsx -> ProjectGraphPage (scoped)
```

`app/(app)/layout.tsx:12-36` menu adds entry `Graph` (icon `GitBranch`) beside `Analytics/Planner`; navigation array in `src/components/layout/nav.ts:??` extended.

`graph/page.tsx` pattern mirrors `analytics` page:

```ts
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {wid} = await getCalendarContext("/graph"); // lib/calendar-page.ts:6-15
  return <DependencyGraphPage wid={wid} />; // "use client" component
}
```

### 13.2 Embeds in Existing Pages

- `TaskEditor.tsx:83-433` autosave region adds `<TaskDependenciesPanel taskId wid />` (lists `blockedBy` with search to add, "Add dependency" combobox, blocked badge, cycle inline error).
- `ProjectDetail.tsx:34-261` similar `<ProjectDependenciesPanel>`.
- `TasksPage.tsx:26-81` filter chip "Blocked" + toggle "Hide blocked".

No modification to `TasksSidebar:35-80` counts except optional `blocked` count via `TaskCountsDTO:34-40` extension (`blocked:number`).

---

## 14. Visualization Components

### 14.1 Library Choice — `@xyflow/react` (React Flow)

Rationale vs alternatives:

| Library | Pros | Cons | Fit |
|---|---|---|---|
| **@xyflow/react** | MIT, React 19 compatible, handles 1k nodes, built-in minimap/controls, Tailwind themable, auto-layout via `dagre` optional | Needs `dagre` for hierarchical layout | **Best for DAG** |
| `d3` | Maximum control | Heavy, imperative, not React-idiomatic | Overkill |
| `recharts`/`visx` | Good for DailyChart (`BarChart:18-51`) but not graphs | No DAG support | Not suitable |
| `react-flow` v11 legacy | Stable but Xyflow rebrand is current | — | Use `@xyflow/react` |

Already Tailwind `v4` (`package.json:30`) + `lucide-react:18` icons align with `ProgressBar:24-29`/`DailyChart:66-101` card styling.

New `src/components/graph/`:

```
src/components/graph/
  DependencyGraph.tsx       # "use client", wraps ReactFlow
  GraphControls.tsx         # minimap, fitView, zoom, toggle blocked/criticalPath
  GraphNode.tsx             # custom node: Title + StatusBadge + BlockedIcon + Due
  GraphEdge.tsx             # custom edge: type label, critical path highlight
  GraphLegend.tsx           # blocked / cycle / criticalPath keys
  GraphEmptyState.tsx       # zero-edge CTAs
  TaskDependenciesPanel.tsx # list+add UI for TaskEditor
  ProjectDependenciesPanel.tsx
  layout.ts                 # dagre layout: elkjs or dagre helper (pure)
```

**Styling:** Reuse `rounded-xl border border-zinc-200/90 bg-white p-5 shadow ... dark:…` (`DailyChart:21`) for outer card, `ProgressBar:24-29` patterns for critical path duration bar.

**Performance:** Virtualization unnecessary; workspace graphs under 500 tasks render at 60fps; beyond that server can cap `limit 500` with warning.

**No chart library installed yet** (requirement: do not install). Placeholder layout uses pure CSS grid until dependency approved; `dagre` is optional peer (install later with `npm i @xyflow/react dagre`).

### 14.2 Layout Algorithm

- Server returns unordered `nodes+edges`; client runs `dagre` (layered DOT, `rankdir: TB`, `nodesep 40, ranksep 70`) to compute `x,y`.
- Fallback without dagre: topological levels as rows, then CSS grid.

---

## 15. Security, RBAC, Workspace Isolation

- Every dependency mutation checks `requireWritableMembership` (`task.repository.ts:186`) + `requireMembership` for reads (`listTasks:119`), so `SUSPENDED/DELETED` workspaces block graph entirely; `ARCHIVED` read-only.
- `viewer` blocked via `member.role==="viewer" → ForbiddenError` (`task.repository.ts:187-189`), consistent with `base.ts:91-102` `assertCanWrite`.
- `owner/admin` vs `member`: non-elevated can only mutate own tasks (`assertCanWrite:99`), elevated can attach dependencies even if task not owned—needed for project managers reordering others' work. Explicitly documented.
- Platform RBAC unaffected (admin routes still via `authorizeAdmin:152`), graph is workspace feature, not platform feature.
- Rate limit inherited from AI path (`command/route.ts:132-145` burst 20/min) if AI suggestions called heavily; add `checkRateLimit` `key: dependency:suggest:${userId}` `limit 30 window 60s` if needed.
- All `blockedBy` IDs validated with `oid()` (`base.ts:31-36`) + existence in same `workspaceId`; cross-workspace links rejected as `404`.
- CSP/nextConfig unchanged (`next.config.ts` empty); graph SVG is client-rendered, no `dangerouslySetInnerHTML`.

---

## 16. Migration & Rollout

1. **Phase 0 – Schema only** (no downtime): Deploy new optional `blockedBy` field + indexes. Existing docs unaffected (default `[]`). `validateDependencyAdd` prevents bad writes.
2. **Phase 1 – APIs + algorithms** behind feature flag `features/evaluation.ts:111` key `dependencyGraph` (fail-open → disabled by default, enable per workspace for beta).
3. **Phase 2 – UI** gated by same flag + `isFeatureEnabled("dependencyGraph")` check in page/layout; embed panels hidden if disabled.
4. **Backfill:** none required; optional script to infer temporary dependencies from title heuristics ("depends on #123") via one-off Node script (not migration).
5. **Backward compat:** `listTasks` unchanged (no graph cost unless `graph` endpoint called). `TaskRecord` serialization adds `blockedBy: []` default so old clients ignore.

---

## 17. Testing Strategy

### 17.1 Unit (pure, no DB) — `src/lib/graph/*.test.ts` (vitest)

- `detectCycle`: acyclic line, diamond, self-loop, 3-node cycle, disconnected, large 100-node.
- `topologicalSort`: validates Kahn returns level order; cycle returns null.
- `blockedClosure`: done vs in_progress upstream, transitive, completed downstream unblocks.
- `computeCriticalPath`: diamond longest path, fallback priorityWeight, due proximity tie-breaker.
- `dependency-suggest` ranking: semantic stub vs lexical.

### 17.2 Repository Integration (MongoMemoryServer)

- `addTaskDependencies` success, duplicate dedupe, max 50, self-dep 400, cross-workspace 404, viewer 403, cycle 400 with path.
- `getTaskGraph` returns correct blocked map for linear chain done→todo.
- Index existence assertion via `Task.collection.getIndexes()`.

### 17.3 API / E2E (Playwright pattern like existing `analytics`)

- Create 3 tasks A,B,C → link B blockedBy A → verify `GET /graph` blocked:true → complete A → blocked:false → try add A blockedBy C (would cycle C→B→A→C) → expect 400.
- UI: TaskEditor dependency combobox search, add, cycle error toast, graph page renders nodes/edges, minimap interaction.

### 17.4 Regression Guard

Existing `TasksPage`, `PlannerView`, `scheduler.ts` tests re-run with blocked tasks present (ensure `buildDayPlan` still respects Morning/Afternoon/Evening windows `scheduler.ts:144-148`).

---

## 18. Observability & Ops

- Extend `activity-log.model.ts` for `action: "dependency_added" | "dependency_removed"` (or reuse `updated` with metadata).
- `publishDomainEvent("task.dependency.added")` already noted; consumable by `realtime/server.ts:107-108` WebSocket `ws:${workspaceId}` for live graph sync (optional).
- Metrics `getInsights` can surface `blockedCount`, `cycleDetected`, `criticalPathDays` alongside existing overdue/completion metrics.
- Admin overview `getAIOverview:114-142` style dashboard could show workspace graph stats; no new admin model needed.

---

## 19. Alternatives Considered

| Alternative | Why Rejected for MVP |
|---|---|
| **Separate Edge collection** | Extra join, loses atomicity of embedded update; premature for <500 edges/ws |
| **String edge list `dependsOn: string[]` without type** | Blocks future `start_to_start`; sub-schema is negligible cost |
| **Auto-infer dependencies via AI on create** | Violates suggest-only safety (`note-intelligence:6-9`); opt-in suggestion is safer |
| **Graph stored as adjacency matrix** | Sparse workspace graphs waste space |
| **D3 force layout** | Non-deterministic, poor for DAG hierarchy vs dagre layered |
| **Modify existing Task/Project status to "blocked" enum** | Adds persisted derived state (drift risk); derived `blocked` is truth |
| **Project dependencies via task cross-links only** | Coarser phase ordering needs project-level edges separate from tasks |

---

## 20. Implementation Phases & File Map

### Phase 1 – Foundation (no UI)

```
src/lib/db/enums.ts:1                      + TASK_DEPENDENCY_TYPES, PROJECT_DEPENDENCY_TYPES
src/models/task.model.ts:4,20,42,66        + TaskDependency sub-schema, indexes
src/models/project.model.ts:4,20,34        + ProjectDependency sub-schema
src/lib/validation/dependencies.ts (new)   validateDependencyAdd/Update, max 50, dedupe
src/lib/graph/dag.ts (new)                 buildAdj, detectCycle, topologicalSort, blockedClosure
src/lib/graph/critical-path.ts (new)       computeCriticalPath
src/lib/graph/project-graph.ts (new)       project variant
src/repositories/task.repository.ts:113    + getTaskGraph, add/remove/setTaskDependencies, getBlockedTasks, detectCycle
src/repositories/project.repository.ts:42  + project graph methods
src/services/task.service.ts:22            + add/remove/setUserTaskDependencies, getUserTaskGraph
src/services/project.service.ts:28         + project wrappers
app/api/workspaces/[wid]/tasks/graph/route.ts (new)
app/api/workspaces/[wid]/tasks/[id]/dependencies/route.ts (new)
app/api/workspaces/[wid]/projects/graph/route.ts (new)
app/api/workspaces/[wid]/projects/[id]/dependencies/route.ts (new)
```

### Phase 2 – AI Suggestions

```
src/lib/ai/dependency-suggest.ts (new)     rankDependencyCandidates (semantic + lexical + due proximity)
src/lib/ai/tools.ts:30-641                 + suggest_dependencies, analyze_critical_path, get_blocked_tasks
src/lib/ai/prompts.ts:3-23                 extended graph guidance
src/lib/ai/workflows/dependency-graph.ts (optional) StateGraph sub-workflow
```

### Phase 3 – State + UI Core

```
src/store/dependencyGraphApi.ts (new)      RTK Query slice, tagTypes DependencyGraph/ProjectGraph
src/store/store.ts:12-34                   register reducer+middleware
src/components/graph/ (new folder)         DependencyGraph, GraphNode/Edge, GraphControls, layout
app/(app)/graph/page.tsx (new)             workspace graph page + layout
app/(app)/graph/layout.tsx (new)
```

### Phase 4 – Integration & Polish

```
src/components/tasks/TaskEditor.tsx:83     + TaskDependenciesPanel import
src/components/tasks/TaskListItem.tsx      + blocked badge (isBlocked via RTK)
src/components/projects/ProjectDetail.tsx:34 + ProjectDependenciesPanel
src/components/tasks/TasksPage.tsx:26     + Blocked filter chip
src/lib/planning/scheduler.ts:128          + blocked-aware sort (deprioritize blocked)
src/lib/scheduling/items.ts:18,73          + mergeSchedule filter option includeBlocked
```

### Phase 5 – Hardening

```
Tests: src/lib/graph/*.test.ts, repository integration, Playwright e2e
Docs: update ARCHITECTURE.md §4 (Task/Project blockedBy)
Feature flag: src/lib/features/catalog.ts add dependencyGraph
Observability: activity + realtime events + analytics stats
```

**Strictly out of scope for this design:** Installing packages, modifying `ARCHITECTURE.md`, changing existing `status` enums, altering `requireFlag("tasks")` semantics, touching `connection.ts:30-50` pooling, or changing `applyJsonTransform`.

---

## Appendix A — Example Graph Payload

```json
{
  "nodes": [
    {"id":"64f…a","title":"Design API","status":"done","priority":"high","dueAt":"2026-05-10T10:00:00Z","blocked":false,"type":"task"},
    {"id":"64f…b","title":"Implement auth","status":"todo","priority":"urgent","blocked":true,"blockedBy":["64f…a"],"type":"task"}
  ],
  "edges": [{"from":"64f…b","to":"64f…a","type":"finish_to_start"}],
  "blocked": {"64f…b":{"blocked":true,"blockedBy":["64f…a"],"reason":"Upstream Design API not done"}},
  "cycle": null,
  "criticalPath": ["64f…a","64f…b","64f…c"],
  "stats": {"total":42,"blockedCount":7,"edgeCount":11,"estimatedCriticalDays":3}
}
```

## Appendix B — Safety Checklist for Implementation PR

- [ ] New fields default `[]`; no existing document migration
- [ ] `requireWritableMembership` + `viewer` check on every write
- [ ] `oid()` + same `workspaceId` existence check for each dep
- [ ] `detectCycle` before save, error includes cycle path, never persists cycle
- [ ] Max 50 edges/task, deduped, self-ref rejected
- [ ] `getTaskGraph` workspace-scoped single `find({workspaceId})`, no N+1
- [ ] Planner next-action excludes blocked unless toggled
- [ ] AI tools suggest-only, allowlist gated, never auto-link
- [ ] New indexes include `workspaceId` first, explain via `explain()`
- [ ] No modification to existing `status/priority/recurrence` enums
- [ ] Visualization gated behind `dependencyGraph` feature flag, CSS-card styled like `DailyChart:21`
- [ ] Unit tests for dag/criticalPath, repo integration for cycle, Playwright for UI

