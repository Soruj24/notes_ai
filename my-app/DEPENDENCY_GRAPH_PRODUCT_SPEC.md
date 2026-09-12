# Dependency Graph — Project Control Center Product Spec

> Status: **SPEC ONLY — no code, no dependencies installed.**  
> Location: `D:\Notes\my-app` (Next 16 / React 19 / Mongoose 9 / RTK Query / Tailwind v4).  
> Parent docs: `DEPENDENCY_GRAPH_ARCHITECTURE.md`, `DEPENDENCY_GRAPH_UX_AUDIT.md`.  
> This spec redesigns the Dependency Graph from a *visualization* into the **primary workspace for managing a project** — the user should be able to run an entire project without constantly leaving the graph.

---

## 1. Vision & Principles

**Vision:** The graph is not a picture of work — *it is work*. Every core project action (create, edit, reassign, complete, link, unblock, plan) is available inline, with clear hierarchy, excellent readability, and AI as a co-pilot, not a bolt-on.

**Principles:**

1. **Workspace, not view.** The graph owns `project overview → phases → milestones → tasks → subtasks → dependencies` in one mental model, not six tabs the user must chase (`ProjectDetail.tsx:187` today hides Dependencies as 5th tab).
2. **Premium minimal.** Zinc + single indigo accent, `rounded-md` `border-zinc-200` (no `rounded-xl` `shadow-lg` — `Card.tsx:14` `shadow-[0_1px_2px]` is the ceiling), `11–13px` type, `150ms` transitions.
3. **Temporal hierarchy over technical hierarchy.** `Goal → Project → Task` (`project.model.ts:12` comment) is stored hierarchy; the control center surfaces *temporal* hierarchy: `Block → Unblock → Critical → Ready → Blocked`.
4. **Single source of truth, two lenses.** One `TaskDependency` DAG (`task-dependency.model.ts:8` `predecessorTaskId/successorTaskId/type`) powers global `/dependencies` and project-scoped `ProjectDetail → Dependencies`; no duplicated `ProjectDependenciesTab.tsx:60` logic.
5. **No data duplication, no mock.** Every panel reads real `dependencyGraphApi` (`store/dependencyGraphApi.ts:67` `getProjectDependencyGraph`) and `tasksApi` (`store/tasksApi.ts:34` `listTasks`), not local mocks — `suggestProjectDependencies` (`dependency-suggestion.service.ts:15`) is the only AI ingress, and it never writes until explicit Accept.

---

## 2. Goals & Non-Goals

### 2.1 Goals (must ship as primary workspace)

- Manage an entire project without leaving the graph: overview, phases, milestones, tasks, subtasks, dependencies, blockers, deadlines, priorities, progress, status, critical path, health, AI planning/suggestions, task CRUD/reassignment/completion, dependency CRUD — all inline.
- Clear hierarchy: project → phases (lanes) → milestones (anchors) → tasks (cards) → subtasks (checklist) with dependencies as edges across lanes.
- Professional PM feel: Gantt-aware but graph-first; due dates and durations drive layout, not just filter.
- AI as teammate: `Analyze project dependencies` / `Suggest dependencies` / `What is blocking?` / `Critical path` / `Plan day/week` are first-class actions in the workspace, not hidden in `assistant`.

### 2.2 Non-Goals (this spec)

- No new database (stay `MongoDB` `connection.ts:8` `mongodb://127.0.0.1:27017/notoai`), no new package without approval, no `Gantt` as replacement (graph remains primary, timeline is a phase overlay).
- No cross-workspace project graph (workspace isolation `base.ts:45` `requireMembership` stays).
- No real-time cursors — `publishDomainEvent` (`realtime/domain.ts:38`) invalidates caches, not live presence.

---

## 3. Personas & Jobs

| Persona | Job in control center |
|---|---|
| **Owner/PM** | Define phases/milestones, link `UI depends on API` (`notes` example), see blockers, unblock by reassigning, see critical path, health, and AI plan to hit `dueAt`. |
| **Contributor** | Create/edit own tasks, mark `done`/`in_progress`, see `Ready to start` (`ReadyToStart.tsx:9` `!blocked && !done`) vs `Blocked by: <task>` (`TaskListItem.tsx:147`), focus chain. |
| **Viewer** | Read graph, cannot mutate (`task-dependency.repository.ts:82` `viewer → ForbiddenError`). |

---

## 4. Information Architecture (Before vs After)

### 4.1 Before (audit)

- Global `/dependencies` (`app/(app)/dependencies/page.tsx:7` `requireWorkspace → DependencyGraphPage`) is top nav (`nav.ts:46` `href /dependencies`), but project graph lives as 5th tab `ProjectDetail.tsx:243` `id: dependencies` hidden behind `Overview` default (`tabs.tsx:21` `defaultValue overview`). KPI duplication: `DashboardPage.tsx:34` fetches `BlockedTasks + ReadyToStart + CriticalPathCard + DependencyAlerts` each with its own `useGetDependencyGraphQuery` — four identical heavy `buildGraph` (1000 nodes) for one screen.
- Creation lives only in `GraphDetailsPanel.tsx:133` bottom form (`predecessor — blocks` / `successor — blocked` `OptionMenu`) far from `TaskEditor.tsx:297` where tasks are created — two disjoint creation surfaces.

### 4.2 After — Control Center IA

```
Project Workspace Header (persistent)
/projects/[id] — title, health, progress, due, critical duration, workspace switcher

Primary Canvas (graph-first, phase-aware)
┌─────────────────────────────────────────────────────────────────┐
│ Left: Phases (lanes)  Center: Graph (nodes = tasks + milestones)  Right: Rail │
│ - Phase lanes map to Task status or Project milestone            │ - Details  │
│ - Milestone anchors are pinned nodes                             │ - Chain    │
│ - Edges span lanes                                               │ - Activity │
└─────────────────────────────────────────────────────────────────┘
Bottom: Inline tab strip (All → Filter) + pagination (150 limit) — not a full page Tabs
Right Rail (sticky, 320px desktop / bottom sheet mobile)
  Overview | Chain | Create | AI
Footer: Legend + zoom/pan controls (desktop) / View Graph button (dashboard alerts)
```

**Navigation:**

- **Entry points:** `Global /dependencies` (workspace overview, filter by `projectId` via `GraphFilters.tsx:69` `OptionMenu Project`) and `ProjectDetail → Dependencies` (now 2nd tab after `Tasks`, not 5th). Both render the *same* `DependencyGraph` component filtered by `projectId` (`dependencyGraphApi.ts:67` `getProjectDependencyGraph`).
- **Single graph component, two scopes:** Pass `projectId?` prop; when present, service `buildGraph` filters `filteredDeps = deps.filter(taskIds.has(pre) && taskIds.has(succ))` (`task-dependency.service.ts:218`) — no duplicated logic.

**Phase modeling (no schema migration):** `Project → Task.projectId` (`task.model.ts:56`) is the phase key. Milestones (`goal.model.ts:12` `milestoneSchema` `title/done/targetDate`) are rendered as lane headers or pinned diamond nodes. No new `Phase` collection; phase = `projectId + status` lane or `milestone.targetDate` swimlane.

---

## 5. Core Capabilities — Detailed Spec

### 5.1 Project Overview (header, always visible)

- **Fields:** `Project.name` (`project.model.ts:24` `120`), `description` (`5000`), `status` (`active/on_hold/completed/archived` `enums.ts:22` → `Badge: ProjectDetail.tsx:105`), `dueAt` (`project.model.ts:28`), `goalId` → `Goal.title` (`goal.model.ts:46`), `color` (`project.model.ts:27`), `progress {percent,done,total}` (`ProjectDetail.tsx:160` `ProgressRing 64` + `dl Complete/Tasks done/Linked notes` `ProjectDetail.tsx:162`).
- **Health (new, derived):** `healthy | at-risk | blocked` computed from `graph.stats.blockedCount / criticalPath.totalMin / overdue` (reuse `isOverdue` `types.ts:83`). Shown as `dot + label` next to title, not a badge.
- **Actions:** `Edit` (`ProjectEditorDialog`), `Archive/Unarchive` (`PATCH /workspaces/[wid]/projects/[id]` `ProjectDetail.tsx:44`), `Delete` (`DELETE` `ProjectDetail.tsx:58`) — kept in header, not inside tabs.

### 5.2 Phases

- **Lane definition:** `Phase = Task.status` lane (`todo | in_progress | done`) OR `Phase = Milestone` lane (vertical swimlane per `Goal.milestones` sorted by `targetDate`). Config toggle in canvas toolbar (default `Status`).
- **Behavior:** Drag task card between lanes → `updateUserTask({status})` (`task.service.ts:82` `PATCH /workspaces/[wid]/tasks/[id]`). Lane header shows count + blocked indicator.
- **No new model:** Phase is a view over `Task.status` / `Milestone.targetDate`; no `phase` field.

### 5.3 Milestones

- **Source:** `Goal.milestones[]` (`goal.model.ts:52` `title:200, done, targetDate`) linked via `Project.goalId` (`project.model.ts:29`) and `Task.goalId` (`task.model.ts:57`).
- **Presentation:** Milestone as diamond node pinned to top of lane at `targetDate` x-position; tasks linked to goal via `goalId` cluster near it. Click milestone → rail shows `Milestone title / targetDate / progress (done/total)`.
- **Actions:** `Create milestone` → `POST /workspaces/[wid]/goals/[gid]/milestones` (`goals/[gid]/milestones/route.ts:10`), `Toggle done` → `PATCH .../[mid]` (`goals/[gid]/milestones/[mid]/route.ts:13`).

### 5.4 Tasks

- **Card (premium minimal):** Reuse `DependencyNode.tsx:25` redesign: `w-[204px] rounded-md border zinc` `2px` left accent (`blocked amber / critical zinc-700 / selected zinc-900`), title `13px medium`, meta `11px` (`priority dot + status + blocked`), id `10px mono`, no shadow. Click → select + focus chain.
- **CRUD without leaving graph:**
  - **Create:** `+ Task` inline in lane header → `TaskQuickAdd wid projectId` (`ProjectDetail.tsx:194`) but inside canvas (pre-filled `projectId`, `goalId` from nearest milestone). Calls `createUserTask` (`task.service.ts:50` `POST /workspaces/[wid]/tasks`).
  - **Edit:** Click title → inline `Input` (like `TaskEditor.tsx:235` `title input`) with `800ms` autosave (`TaskEditor.tsx:31` `AUTOSAVE_MS`), not a full page.
  - **Reassign:** `Assignee` dropdown in rail (owner `User.name`) → `updateUserTask({ownerId})` (requires `setMember` check – new `PATCH` field, uses `assertCanWrite` `base.ts:91` elevated check).
  - **Complete:** Checkbox in card (like `TaskListItem.tsx:88` `checkbox` with `completeTask/reopenTask` `tasksApi.ts:114` `completeTask` `POST .../complete` that spawns recurrence `task.service.ts:125`).

### 5.5 Subtasks

- **Model already exists:** `SubtaskDoc` (`task.model.ts:4` `title 200, done, completedAt`) array `subtasks` (`task.model.ts:59`).
- **In rail chain view:** Expand selected task → checklist (`SubtaskList` from `TaskEditor.tsx:411`) with `addSubtask:285`, `updateSubtask:297`, `removeSubtask:322` (`POST/PATCH/DELETE /workspaces/[wid]/tasks/[id]/subtasks` `tasks/[id]/subtasks/route.ts:11`).

### 5.6 Dependencies

- **Types normalized:** Store canonical `blocks` (`TaskDependency.type` `enums.ts:89` `blocks|blocked_by|related`). UI accepts `blocked_by` input but swaps ids before validation (prevents duplicate `409` from `task-dependency.model.ts:44` unique ignoring type). `related` is weight `0` – excluded from `blockedClosure`/`computeCriticalPath` (today `dag.ts:8` treats all as blocking – must filter).
- **Create:** Drag handle from card edge → drop on target → `create_dependency` (`tools.ts:889` `type blocks`) with `hasPath(B,A)` check (`task-dependency.service.ts:39` `hasPath(successor, predecessor)`) + `detectCycle` before `TaskDependency.create`. `GraphDetailsPanel.tsx:133` bottom form remains as alternative (`predecessor/successor` `OptionMenu`).
- **Remove:** Click edge → details `Delete` (`GraphDetailsPanel.tsx:126`) → `deleteDependency` (`DELETE /api/v1/dependencies/:id?workspaceId` `dependencies/[id]/route.ts:8` + `assertCanWrite` `task-dependency.repository.ts:251`).
- **Data:** Reuse `dependencyGraphApi` `getProjectDependencyGraph` (select lean `title,status,projectId,priority,durationMin` `task.repository.ts:102` + `select(prede,succ,type)` `task-dependency.repository.ts:174`).

### 5.7 Blockers

- **Derived, not stored.** `blocked = blockedClosure(blockedAdj, doneSet)` (`dag.ts:93` `!done.has(pred) || isBlocked(pred)`) where `done = status==="done"` (`task-dependency.service.ts:230` – extend to include `archived` as done as in `intelligence.ts:13`). `GraphDetailsPanel` shows `Dependencies` (upstream) and `Dependents` (downstream) lists with `Remove`.
- **Card indicator:** `Blocked by: <task>` (`TaskListItem.tsx:147` `Link /dependencies?focus=`) – in graph, blocked nodes show `Blocked` text in meta (`DependencyNode.tsx:62` `blocked ? Blocked`).

### 5.8 Deadlines & Priorities

- **Deadline:** `Task.dueAt` (`task.model.ts:53`) + `Project.dueAt` (`project.model.ts:28`) drive `formatDue` (`types.ts:92` `Today/Tomorrow/Yesterday`) and `isOverdue` (`types.ts:83`). Due soon tasks get `amber` dot, overdue `danger` – same tone scale as `intelligence.ts:20`.
- **Priority:** `low/medium/high/urgent` (`enums.ts:19` `PRIORITY_RANK`) as dot (`priorityDot` `DependencyNode.tsx:20`) + `reasonFor` (`scheduler.ts:72` `priority rank`) – critical path already weights by `durationMin` fallback `30` (`critical-path.ts:34`).

### 5.9 Progress

- **Project progress:** `done/total` `percent` (`ProjectDetail.tsx:162` `ProgressRing`) – keep, but add dependency-aware `critical path progress` (`criticalTasks.filter(done).length / criticalTasks.length`) as secondary ring.
- **Task subtask progress:** `subtaskProgress` (`types.ts:110` `done/total`) bar (`TaskListItem.tsx:132`) – shown in rail expanded view.

### 5.10 Task Status

- **States:** `todo | in_progress | done | archived` (`enums.ts:16`) + derived `Blocked/Ready/Overdue` (`intelligence.ts:12` `getTaskIntelligenceState` order `done→archived→blocked→overdue→in_progress→Ready`). Status lane in graph uses `todo/in_progress/done` as phases; `Blocked` is overlay, not lane.

### 5.11 Critical Path

- **Algorithm:** `computeCriticalPath(forwardAdj, durations, topo)` `critical-path.ts:12` `dist[v]=weight(v)+max(dist[pre])` – durations from `durationMin` `30` fallback (`critical-path.ts:34`).
- **Presentation:** Reuse `DependencyGraph criticalPath` highlight (`DependencyGraph.tsx:227` `criticalSet.has(n.id)` `ring-1 ring-zinc-900`) and `CriticalPathCard.tsx:12` list (`1…N` rings, `durationMin`). In control center, critical toggle in toolbar (eye icon) dims non-critical (`opacity 0.38` pattern `DependencyNode.tsx:62`).

### 5.12 Project Health

- **Computation:** `health = blockedCount/total >0.3 ? at-risk : cycle ? blocked : healthy` + `critical path overdue` (any critical task `isOverdue`). Shown as header dot + `View Graph` CTA (`DependencyAlerts.tsx:52` `Most important blocker: Create Authentication API blocks 4 tasks`).

### 5.13 AI Planning

- **Service is already dependency-aware:** `previewPlan` (`planner.service.ts:14`) fetches `getTaskDependencyGraph` (`planner.service.ts:36`), `blockedMap`, `criticalSet`, `downstreamCounts` DFS (`planner.service.ts:62`), filters `!blockedMap[t.id]` (`planner.service.ts:81`), sorts `critical → dependentsCount` (`planner.service.ts:94`), adds `goalTitle` (`planner.service.ts:86`). `reasonFor` (`scheduler.ts:72` `Critical path / Unblocks N / Overdue · Due today`) explains.
- **Control center integration:** `Plan` button in header (next to `AI Suggest`) calls `plan_day` tool (`tools.ts:564` `previewPlan`) with `date` → returns `blocks Morning/Afternoon/Evening` (`scheduler.ts:144` `Morning 9-12/Afternoon 13-17/Evening 17-20`) – preview only, `applyPlan` (`planner.service.ts:144` `POST /workspaces/[wid]/planner` `items: [{taskId,start,durationMin}]`) requires explicit `Apply` click (no overwrite).

### 5.14 AI Dependency Suggestions

- **Service:** `suggestProjectDependencies` (`dependency-suggestion.service.ts:15` fetches `listTasks + listTaskDependencies + projects + goals`, builds `payload {tasks,projects,goals,existingDependencies}`, tries `completeJson` (`complete.ts:47` system `Build Product UI may depend on Build Product API`) `suggestions source/target/reason/confidence`, filters `!existingSet` and `!hasPath(target,source)` to avoid cycle, fallback heuristic `api→ui` (`dependency-suggestion.service.ts:128`), capped `8`/`5`.
- **Tool:** `analyze_project_dependencies` (`tools.ts:625`) and `suggest_dependencies` (`tools.ts:791`) both call `suggestProjectDependencies`, return `{suggestions, note: not yet saved}` – never auto-write.
- **UI:** `SuggestedDependencies.tsx:22` `Accept / Reject` per row, `Accept all` sequential `createDep blocks` (`DependencyGraphPage.tsx:109` loop), `Reject all` – local state until Accept.

### 5.15 Task Reassignment

- **New field:** `Task.ownerId` (`task.model.ts:47` currently `ownerId: member.userId` on `createTask` `task.repository.ts:193`); add `updateTask` support for `ownerId` via `assertCanWrite` elevated / `ELEVATED_ROLES` (`base.ts:90`). UI: rail `Assignee` `OptionMenu` over `WorkspaceMember` (`workspace-member.model.ts:14` `workspaceId,userId,role`) – visible only to `owner/admin`.

### 5.16 Dependency Creation/Removal (summary)

- Create: drag edge, rail `Create dependency` form (`GraphDetailsPanel.tsx:133` `pre/succ OptionMenu` `width 260px`), or AI Accept.
- Remove: edge details `Delete` (`GraphDetailsPanel.tsx:126`), dependency row `Remove` (`GraphDetailsPanel.tsx:79`), or per edge `Delete` in `SuggestedDependencies` after Accept.

---

## 6. User Flows (Without Leaving Graph)

### 6.1 Create Project → Plan → Execute

1. **Create project** (`create_project` tool or `POST /workspaces/[wid]/projects` `projects/route.ts:10`) → lands in control center `Tabs → Dependencies` (now 2nd after Tasks, not 5th).
2. **Add tasks inline** (`+ Task` in lane) → `createUserTask` with `projectId` prefilled.
3. **Link `UI depends on API`** → drag `API card handle → UI card` → `hasPath` check → `TaskDependency.create` → graph updates via `dependencyGraphApi` `invalidatesTags: ["DependencyGraph"]` (`dependencyGraphApi.ts:54`).
4. **AI Suggest** → `Analyze project dependencies` → review `SuggestedDependencies` → `Accept` → `create_dependency` (cycle-checked) → graph re-renders, `Blocked · 2` count updates.
5. **See blockers:** header `Dependency alerts: 3 blocked. Most important blocker: Create Authentication API blocks 4` (`DependencyAlerts.tsx:52`).
6. **Plan day:** `Plan` → `previewPlan` excludes `blocked` (`planner.service.ts:81`), prioritizes `unblocks 2` (`reasonFor` `Unblocks`), shows `Morning/Afternoon/Evening` with `reason: Unblocks 2 tasks · Due today` – `Apply` writes `startAt/durationMin` (`applyPlan` `planner.service.ts:144`).

### 6.2 Unblock & Reassign

- Click `Blocked` task (dimmed others `opacity 0.38` `DependencyNode.tsx:62`) → rail shows `Dependencies: A (blocked_by)` and `Dependents: C, D` → click `A` predecessor → focus chain. `Assignee` dropdown → reassign blocked task to available owner → `updateTask` → `BlockedTasks` count drops.

---

## 7. Screen & Component Architecture

### 7.1 Components (reuse, not duplicate)

- **Canvas:** `DependencyGraph.tsx:73` `520px` `autoLayout` `NODE_W 210` `ROW_GAP 36` virtualized + `DependencyGraphMobile.tsx:79` `max-h-[64vh] divide-y` list (mobile pattern `hidden md:block` vs `block md:hidden` `DependencyGraphPage.tsx:239`). Keep lazy `dynamic(() => import(...), {ssr:false, loading: GraphSkeleton})` (`DependencyGraphPage.tsx:13`).
- **Node:** `DependencyNode.tsx:25` memoized `204px` `rounded-md border zinc` with `2px` left accent – **no new component**, just tune.
- **Edge:** `DependencyEdge.tsx:12` memoized `stroke transparent 12` hit area + `1.6/1.25` visible.
- **Filters:** `GraphFilters.tsx:46` `OptionMenu` (`status/priority/project`) + `Search 13px` with `useDeferredValue` (`DependencyGraphPage.tsx:40`) + pagination `graphLimit 150` (`DependencyGraphPage.tsx:65`) – keep.
- **Details:** `GraphDetailsPanel.tsx:38` right rail `320px` desktop `lg:sticky lg:top-6` (`DependencyGraphPage.tsx:236`) / bottom sheet mobile – tabs `Overview | Chain | Create` instead of stacked `Dependencies/Dependents` + persistent form.

### 7.2 New/Modified Components

- `ProjectDependenciesTab.tsx:17` → thin wrapper that reuses `DependencyGraph` + `BlockedTasks` + `ReadyToStart` + `CriticalPathCard` + `SuggestedDependencies` – remove its own `grid gap-6` reimplementation, instead import `DependencyGraphPage` logic as `ProjectControlCenter` with `projectId` prop.
- `TaskEditor` inline: add `DependencyPicker` (searchable `CommandMenu` over `listTasks` filtered `!blocked`, `projectId`) – still calls `create_dependency` service, not direct `TaskDependency.create`.

---

## 8. Data & API Architecture (No New DB)

- **Models stay:** `Task` (`task.model.ts:44` `workspaceId, ownerId, title, status, priority, dueAt, durationMin, projectId, goalId, tags, subtasks`) + `TaskDependency` (`task-dependency.model.ts:8` `workspaceId, predecessor, successor, type, createdBy`) – no `Phase` collection.
- **Phase & milestone are views:** `Phase = Task.status` lane; `Milestone = Goal.milestones` (`goal.model.ts:12` `targetDate`) pinned node – no migration.
- **Indexes consolidated:** Keep `task-dependency.model.ts:44` `unique {workspace,pre,succ}` and covering `{workspace,pre,succ,type}` `task-dependency.model.ts:55` (remove `task-dependency.model.ts:50-52` duplicates); `Task` keep `workspace,projectId` + `workspace,status,dueAt` (`task.model.ts:66-67`), add `{workspace, projectId, status}` for phase lane – drop `task.model.ts:71,73` duplicates.
- **Graph query is lean:** `listTasksForGraph: select(title,status,projectId,priority,durationMin)` (`task.repository.ts:102`) `limit 1000` + `listDependenciesForGraph: select(prede,succ,type)` `limit 2000` (`task-dependency.repository.ts:174`) – already optimized for 1000+ tasks (`DependencyGraphPage.tsx:65` `graphLimit`).
- **API verbs consolidated:** Keep `GET /api/v1/dependencies/graph?workspaceId` and `GET /api/v1/projects/:id/dependencies/graph`; consolidate suggestions to single `GET /api/v1/dependencies/suggestions?workspaceId&projectId` (remove dual `GET/POST` anti-pattern `dependencies.controller.ts:207`). Add `PATCH /api/v1/dependencies/:id {type}` (missing today – only `create/delete` `dependencies.controller.ts:57/93`).

---

## 9. AI Architecture

- **Tools remain allowlisted:** `TOOL_NAMES:30` `analyze_project_dependencies`, `get_blocked_tasks`, `get_ready_tasks`, `find_circular_dependencies`, `get_critical_path`, `suggest_dependencies` + required `get_dependency_graph` etc. (`tools.ts:30`) – all `service-backed never Mongo directly` (`tools.ts:12`). Keep `ai.tools.allowlist` (`settings.ts`).
- **No direct DB:** Every AI path goes `ToolContext {userId, workspaceId}` (`tools.ts:20`) → `requireMembership` → `Service` (e.g., `suggestProjectDependencies` → `completeJson` + heuristic fallback) → structured `{source,target,reason,confidence}`.
- **Explainability:** `reasonFor` (`scheduler.ts:72` `Unblocks N · Due today`) and `rankDependencyCandidates` already return `reason`; `ai_runs` logging should persist `suggestions` input hash for eval.

---

## 10. Interaction & Visual Design (Premium Minimal)

- **Hierarchy:** Header `text-[16px] tracking-tight` (`DependencyGraphPage.tsx:136`), section `text-[11px] uppercase tracking-wide` (`GraphLegend.tsx:5`), body `13px` – keep. Remove layered `rounded-xl` cards; use single `rounded-md border zinc-200` per section.
- **Color:** Retain `zinc` base `bg-white dark:bg-zinc-950` (`GraphDetailsPanel.tsx:38`), single accent `indigo` for `selected/critical`, `amber-500` only for `Blocked` dot (not badge flood).
- **Mobile thumb-reach:** Keep `DependencyGraphMobile` vertical list; add bottom sheet for details (`Drawer.tsx:8` already exists) instead of shrinking desktop graph.

---

## 11. Metrics & Health

- **Project health:** `blockedCount/total >0.3 → at-risk` + `critical.overdue` (`isOverdue` on `criticalTasks`) → `blocked` (`BlockedTasks.tsx:24` `stats.blockedCount`).
- **Critical path progress:** `criticalTasks.filter(done).length / criticalTasks.length` secondary `ProgressRing` beside project `percent` (`ProjectDetail.tsx:160`).

---

## 12. Implementation Guardrails

- **No new package.** Reuse `lucide-react`, `zinc` palette, `Popover`, `OptionMenu` (`option-menu.tsx:30`), `Tabs` (`tabs.tsx:21`), `mongoose` indexes, `RTK Query` keyed tags (`dependencyGraphApi:35` → `{type:"DependencyGraph", id: workspaceId}` to fix `DependencyAlerts.tsx:13` over-fetch).
- **Incremental:** First normalize `type` (`blocks` canonical), consolidate suggestions to one endpoint, fix `projectOptions label: id.slice(0,8)` (`DependencyGraphPage.tsx:78`) to use `project.name`, add inline `DependencyPicker` to `TaskEditor`, then phase lanes.
- **Verification:** `buildGraph` 1000 nodes/2000 edges must stay <300ms (memo `autoLayout` `useMemo([nodes,edges])` `DependencyGraph.tsx:74` + pagination `graphLimit 150`).

