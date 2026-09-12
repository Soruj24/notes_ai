# Dependency Graph — UX Audit

> Scope: entire existing implementation inspected at `D:\Notes\my-app`.  
> Goal: diagnose why the current Dependency Graph does not feel like a professional project-management system.  
> Code references are `file:line`. No code modified; no packages installed.

---

## 1. Current Problems (Executive Summary)

The Dependency Graph today is a **data-correct but workflow-orphaned overlay**. The DAG is mathematically sound (`src/lib/graph/dag.ts:38` `detectCycle`, `src/services/task-dependency.service.ts:200` `buildGraph` with `blockedClosure`), but the product treats dependencies as a second-class feature bolted onto tasks/projects/goals rather than as a first-class planning primitive. The result is not a user-friendly system: discoveries hide 5 tabs deep (`ProjectDetail.tsx:244` inside `Tabs` default `overview`), creation requires leaving the editor (`TaskEditor.tsx` has no predecessor picker while `GraphDetailsPanel.tsx:133` has the only create form), and the graph itself re-centers on every selection (`DependencyGraph.tsx:147` + `DependencyGraphPage.tsx:290` double focus). With 100+ tasks the page renders 100+ absolute nodes (`NODE_W 210` `DependencyGraph.tsx:22`) and 1000-node workspaces are pagination-bandaided (`DependencyGraphPage.tsx:216`) rather than designed for.

**Root causes in one line:** *hierarchy is technical (Goal → Project → Task) not temporal (Block → Unblock → Critical); the graph is a view, not a workflow.*

---

## 2. UX Problems

### 2.1 Visual & Readability
- **Monochrome over-uniformity loses signal.** All `zinc` base (`bg-white dark:bg-zinc-950` `DependencyGraphPage.tsx:163`) with only `amber-500` for blocked and `zinc-900` badge for critical (`DependencyNode.tsx:96`, `GraphLegend.tsx:23`). Priority dots `low/medium bg-zinc-300/400` (`DependencyNode.tsx:21`) are visually identical to legend `In chain bg-zinc-400` (`GraphLegend.tsx:12`) – blocked vs priority vs chain are indistinguishable at glance.
- **Excessive micro-badges create clutter.** `DependencyNode.tsx:58-67` stacks up to 4 `Badge` (`statusTone` + `priority` + `blocked` + `critical`) in `74px` height; `GraphDetailsPanel.tsx:68` repeats `Dependencies/Dependents` lists with `Remove` per row – the node itself is an overload of labels rather than a hierarchy (title vs meta).
- **Typography hierarchy flat.** Header `text-[16px] semibold tight` vs body `13px` vs labels `11px uppercase tracking-wide` is correct, but `GraphFilters.tsx:49` input `h-7` and `OptionMenu h-8` sit in a `rounded-md border bg-white px-3 py-2.5` card – the filter bar, legend, AI bar, cycle banner, pagination banner each have their own `rounded-md border` – five stacked banners before the graph (`DependencyGraphPage.tsx:150 + 163 + 171 + 198 + 216`) create vertical noise.

### 2.2 Professionalism & Premium Feel
- **Panels compete.** `DependencyGraphPage.tsx:131` `mx-auto max-w-[1280px]` + header `border-b zinc-100` is premium, but `GraphSkeleton.tsx:5` `animate-pulse rounded-xl 420px` and `GraphEmptyState.tsx:7` `h-[360px] border-dashed` still use `rounded-xl`/`shadow-sm ring-1` (`GraphEmptyState.tsx:8`) – excess rounding and shadows contradict minimal goal.
- **Controls are mixed paradigms.** `GraphToolbar.tsx:15` four `h-7 w-7` icon buttons (`Plus/Minus/Scan/RotateCcw`) have only `aria-label`, no tooltip text – Fit (`Scan`) vs Reset (`RotateCcw`) are ambiguous. `GraphFilters.tsx:69` uses `OptionMenu` (custom, good) but `projectOptions label: id.slice(0,8)` (`DependencyGraphPage.tsx:78`) shows raw UUID prefix – unprofessional.
- **Dark mode is derived, not designed.** Every component repeats `dark:border-zinc-800` but `DependencyNode.tsx:62` dimmed `opacity 0.38 + grayscale(0.2)` on dark makes chain barely legible.

### 2.3 Task-Centric UX Gaps
- **No inline dependency editing in the primary editor.** `TaskEditor.tsx:268-354` `Schedule` + `Organization` + `Tags` + `SubtaskList` – zero predecessor picker. `TaskListItem.tsx:147` only *shows* `Blocked by: <Link /dependencies?focus>` – to create a link the user must navigate to `/dependencies` and re-find both tasks. `update_task` AI tool `tools.ts:167` supports `projectId nullable` but editor does not.
- **Truncation without affordance.** `taskOptions label title.slice(0,32)` (`GraphDetailsPanel.tsx:35`) and `projectOptions` `slice(0,8)` truncate without tooltip; `titleLabel` for long engineering tasks is unreadable.
- **Direction confusion.** `GraphDetailsPanel.tsx:136` label `Predecessor — blocks` vs `Successor — blocked` and edge `type: blocks|blocked_by|related` (`enums.ts:89`) – `blocked_by` is just inverse of `blocks` but unique index ignores `type` (`task-dependency.model.ts:44` `unique` without `type`) so second insert confusingly `409 ConflictError` (`task-dependency.repository.ts:109`).

### 2.4 Scale UX
- **Empty/filtered state handled only on mobile.** `DependencyGraphMobile.tsx:64` shows `No tasks match filters`, but `DependencyGraphPage.tsx:96` only checks `graph.nodes.length===0`; desktop with `displayNodes=[]` renders empty `520px` canvas with no feedback and `Showing 150 of N` banner even when `filteredNodes=0`.
- **Pagination is a band-aid.** `DependencyGraphPage.tsx:216` `Showing X of Y / Load 150 more` slices `filteredNodes.slice(0, graphLimit)` – edges crossing page boundaries disappear (`displayEdges` filtered to `displayNodes` `DependencyGraphPage.tsx:68`), so chain appears broken at 150.

---

## 3. Information Architecture Problems

### 3.1 Global vs Project Duality
- **Global page is a thin wrapper** (`app/(app)/dependencies/page.tsx:7` `requireWorkspace → DependencyGraphPage`) while **project dependencies are buried** as the 5th tab `ProjectDetail.tsx:243` `id: dependencies` inside `Tabs defaultValue=overview` (`ProjectDetail.tsx:262`). Discoverability is inverted: the most actionable dependency work is project-scoped, yet global `/dependencies` is top-level nav (`nav.ts:46` `href /dependencies`) and project tab is hidden.
- **`ProjectDependenciesTab.tsx:60` re-stacks the same 5 sections vertically** (`grid gap-6` `Graph → Blocked · N → Ready · N → Critical → AI Suggestions`) – it reuses `DependencyGraph` (`ProjectDependenciesTab.tsx:65`) but **does not reuse** `GraphFilters/Toolbar/DetailsPanel` – drift risk.

### 3.2 Header & Stats Hierarchy
- **Header stats are peripheral.** `DependencyGraphPage.tsx:139` `totalTasks · totalEdges · blockedCount` are footer `text-xs text-zinc-500` (`DependencyGraphPage.tsx:237` static text `Total X tasks · Y edges`), not actionable KPIs. `ProjectDetail.tsx:160` `ProgressRing 64` + `dl Complete/Tasks done/Linked notes` is richer than graph header.
- **Blocked/Ready/Critical are duplicated across layers.** Global `BlockedTasks.tsx:24` + `ReadyToStart.tsx:22` + `CriticalPathCard.tsx:12` + `DependencyAlerts.tsx:13` each call `useGetDependencyGraphQuery({workspaceId})` independently – four identical heavy `buildGraph` (1000 nodes/2000 edges) requests for one dashboard (`DashboardPage.tsx:34` composes them in left column).

### 3.3 Navigation & Deep Linking
- **URL is not the state.** Filters (`status/priority/projectId/query`) live in `useState<GraphFilterValues>` (`DependencyGraphPage.tsx:38`) not in `searchParams`; refresh loses filter. Only `focus` is URL-synced via `searchParams.get("focus")` (`DependencyGraphPage.tsx:43` `queueMicrotask setSelectedNodeId`). `PlannerView.tsx:24` tab `useState` suffers same loss.
- **`projectOptions` are IDs, not names.** `DependencyGraphPage.tsx:78` `label: id.slice(0,8)` for `projectId` makes filter labels opaque; `tasksApi` already has project names via `listUserProjects` but not used.

---

## 4. Graph Interaction Problems

### 4.1 Selection & Highlighting
- **Mutual exclusion obscures context.** `onSelectNode:244` clears `selectedEdgeId` and vice versa `248` – cannot inspect a chain and an edge simultaneously. `GraphDetailsPanel.tsx:120` edge details appear below node lists, easy to miss on scroll.
- **Highlight is binary, not graded.** `DependencyGraph.tsx:84-103` builds `highlightedNodes = selected + upstream + downstream` via BFS and `highlightedEdges` where both endpoints highlighted; `dimmed = !!selectedNodeId && !isHighlighted` (`DependencyGraph.tsx:196,218`) `opacity 0.38` – no distinction between direct predecessor vs transitive, or blocked vs ready upstream.
- **Dimmed is too dim.** `DependencyNode.tsx:62` `opacity 0.38 + grayscale(0.2)` and `DependencyEdge.tsx:30` `opacity 0.22` on dark are near-invisible; legend has no “dimmed” entry to explain.

### 4.2 Pan / Zoom / Focus
- **Wheel without `passive:false` may be ignored.** `onWheel e.preventDefault` (`DependencyGraph.tsx:107`) without `{passive:false}` option – Chrome console warns and zoom stutters.
- **No keyboard or touch panning.** `onMouseDown/Move/Up` only (`DependencyGraph.tsx:114-121`) – keyboard arrows, `+/-`, touch `pinch` unhandled. Tablet with touch has no pan.
- **Auto-focus is disorienting.** Every `selectedNodeId` change re-centers (`useEffect focusNode(selectedNodeId)` `DependencyGraph.tsx:147` + `GraphDetailsPanel onFocus` `DependencyGraphPage.tsx:227` `setSelectedNodeId(null) → setTimeout → setSelectedId`) – two competing animations, steals manual pan position, loops on `queueMicrotask` focus (`DependencyGraphPage.tsx:44`).

### 4.3 Toolbar & Legend
- **Toolbar discoverability low.** Four `h-7 w-7` icons (`GraphToolbar.tsx:17-26`) with `aria-label` only, no tooltip/zoom-percentage; `Scan` vs `RotateCcw` metaphor unclear for `Fit` vs `Reset`.
- **Legend is retrospective.** `GraphLegend.tsx:7-11` shows `Selected/In chain/Dependency/Blocked/Critical` but does not explain `CRITICAL` badge vs `criticalSet` or `Ready` (shown elsewhere as `success`).

### 4.4 Mobile
- **Desktop graph is shrunken, not reimagined.** `DependencyGraphPage.tsx:239` `hidden md:block` `DependencyGraph` (`520px` `overflow-hidden`) vs `block md:hidden` `DependencyGraphMobile` (`DependencyGraphPage.tsx:262`) – mobile list is appropriate (`DependencyGraphMobile.tsx:79` `max-h-[64vh] overflow-y-auto` `divide-y`), but uses same `SearchX` empty logic and identical `BlockedDetails` slicing – still requires filters to handle 1000+ (`GraphMobile` hint `Use filters to narrow 1000+ tasks` `DependencyGraphMobile.tsx:118`). No bottom sheet, no swipe to focus, no native thumb-reach beyond `max-h`.

---

## 5. Missing Project-Management Features

- **No Gantt / timeline.** `CalendarPage.tsx` + `scheduleApi` exist, but dependencies never project onto `dueAt/durationMin` timeline – `dueAt` is filter in `TaskList.tsx:44` but not in `buildDayPlan` dependency-aware sort (`planner.service.ts:62` `isOverdueTask` only). No `startAt + duration` bar chart.
- **No bulk project operations.** `TaskList.tsx:60` `page * PAGE_SIZE` pagination is read-only list; no multi-select move to project, no bulk `add dependency`.
- **No project template reuse.** `templates` exist (`templates` flag `catalog.ts:36`) but not linked to dependency scaffolding – cannot stamp `API → UI` pattern into new projects.
- **No progress rollup via dependencies.** `ProjectDetail.tsx:160` `ProgressRing percent` counts `done/total` tasks, not weighted by critical path – completing a leaf `Ready` task inflates percent more than unblocking `critical` task.
- **Calendar tab is an orphan.** `ProjectDetail.tsx:240` `ProjectCalendar` filters `useListEventsQuery({wid})` client-side `e.projectId === projectId` – but API `listEvents:24` has no `projectId` param, so 100 events fetched to show 2; `allDay`/recurrence handling duplicated (`expand.ts:65`).

---

## 6. Missing Dependency Features

- **No typed dependency semantics.** `TASK_DEPENDENCY_TYPES ["blocks","blocked_by","related"]` (`enums.ts:89`) but `buildAdj` (`dag.ts:8`) and `blockedClosure` (`dag.ts:122`) treat all as blocking; `related` should be non-blocking, `finish-to-start` vs `start-to-start` not modeled. `critical-path.ts:12` sums all edges equally, overweighting `related`.
- **No inverse normalization.** `blocks` vs `blocked_by` are directional duplicates (`A blocks B` ≡ `B blocked_by A`) but validation allows both names (`dependencies.ts:51`) and unique index ignores `type` (`task-dependency.model.ts:44`) – second name `409` confusing.
- **No milestone / subtask dependencies.** `SubtaskDoc` (`task.model.ts:4`) and `MilestoneDoc` (`goal.model.ts:4`) exist but only `TaskDependency` (`task-dependency.model.ts:8` `predecessorTaskId/successorTaskId ref Task`) – cannot depend `Subtask` on `Task` or `Goal.milestone` on `Task`.
- **No cross-project edge visualization in project graph.** `buildGraph` project filter drops cross-project edges where only one endpoint in project (`task-dependency.service.ts:219`) – silently hides `API task in Project A blocks UI task in Project B`.
- **No lag/lead or duration awareness in graph.** `durationMin` (0–10080 `task.model.ts:54`) is used for `criticalPath totalMin` (`critical-path.ts:34`) but not for blocked check (`blockedClosure` uses `done` only, not `startAt + duration`).
- **No dependency history/audit.** `logActivity` on create/delete (`task-dependency.service.ts:105`) is generic `updated` on `entityType task` – no `Budget: dependency.added` timeline.

---

## 7. Missing AI Features

- **Suggestions are heuristic-heavy, AI-light.** `dependency-suggestion.service.ts:30` fetches `listTasks + listTaskDependencies + listUserProjects + listGoals` (4 parallel), but `goals` fetch is `try/catch → []` (`dependency-suggestion.service.ts:42`) – resilient yet goals rarely used. `completeJson` `maxTokens 500` (`complete.ts:23`) truncates 10 tasks × 400 chars + projects/goals → >3000 tokens; prompt may clip and fallback to keyword heuristic (`dependency-suggestion.service.ts:119` `heuristicSuggestions`) with pairs `api→ui`, `design→build`, `spec→build` (`dependency-suggestion.service.ts:128`).
- **No conversational grounding.** `analyze_project_dependencies` tool (`tools.ts:625`) returns raw `{source,target,reason,confidence}` without `href` or status; `SuggestedDependencies.tsx:44` maps titles via `taskTitlesMap` but confidence `Math.round(c*100)%` (`SuggestedDependencies.tsx:51`) has no explanation link to description/dates that produced it.
- **AI does not read calendar/goals deeply.** `suggestProjectDependencies` payload includes `tasks {projectId,goalId,dueAt,startAt,durationMin}` `dependency-suggestion.service.ts:72` but does not include `goal.frequency/targetDate` impact or `calendar events` busy blocks – `getInsights` metrics not passed.
- **Planner AI is not dependency-conversational.** `plan_day`/`plan_week` tools (`tools.ts:564/591`) note `dependency-aware` in description, but `claude.md` agent rule `generate-agent-files.js` is not updated – planner still calls `previewPlan` which internally calls `getTaskDependencyGraph` silently; the LLM has no tool to ask “why was A prioritized?”.
- **Tool proliferation without guidance.** `TOOL_NAMES:30` has 6 dependency verbs (`analyze_project_dependencies`, `get_blocked_tasks`, `find_circular_dependencies`, `get_critical_path`, `suggest_dependencies`, plus required `get_dependency_graph` etc. `analyze_project_dependencies` and `suggest_dependencies` are duplicates invoking same service (`tools.ts:807` vs `tools.ts:625`), confusing the LLM allowlist (`settings.ts` `ai.tools.allowlist`).
- **No admin observability.** `ai.service.ts` logs `aiConversationCount` but `SuggestedDependencies` has no `ai_runs` logging, no cost/latency display, no feedback.

---

## 8. Proposed New Architecture

### 8.1 Principles (Premium, Minimal, Productivity-Focused)
- **One graph, two lenses.** Single `TaskDependency` DAG (`task-dependency.model.ts:8`) with `type` normalized to canonical direction (`blocks` stored, `blocked_by` normalized at write). `related` becomes `weight 0` for `blocked`/`critical`.
- **Project is a filtered view, not a duplicate graph.** Global `/dependencies` and `ProjectDetail Tabs → Dependencies` share the same `DependencyGraph` component + `dependencyGraphApi` cache key `{workspaceId, projectId?}` (`store/dependencyGraphApi.ts:67` already supports) – no duplicated `ProjectDependenciesTab` logic.

### 8.2 Data & API
- **Normalized write: accept only `predecessor/successor/type` with Zod + `oid` + `assertTasksInWorkspace` + `hasPath(B,A)` + unique `{workspace,pre,succ}` (keep `task-dependency.model.ts:44`). Map `blocked_by` to `blocks` with swapped ids before validation; `related` persists but excluded from `buildBlockedAdj`/`computeCriticalPath`.
- **Graph queries: `select`-only projections.** Keep `listTasksForGraph: select(title,status,projectId,priority,durationMin)` `task.repository.ts:102` and `listDependenciesForGraph: select(predecessor,successor,type)` `task-dependency.repository.ts:174`, cap `1000 nodes / 2000 edges` with explicit `X-Truncated: true` header when capped (current `stats` silently reports truncated counts `task-dependency.service.ts:271`).
- **Indexes:** Consolidate to 2 covering indexes: `TaskDependency` `unique {workspace,pre,succ}` and `covering {workspace,pre,succ,type}` (remove `task-dependency.model.ts:50-53` duplicates); `Task` keep `workspaceId, status, dueAt` + `workspaceId, projectId` only (remove `task.model.ts:71,73` duplicates). Add TTL on `activitylogs` for retention.
- **API surface:** Consolidate suggestions to `GET /api/v1/dependencies/suggestions?workspaceId+projectId` (keep one verb, remove dual `GET/POST` anti-pattern `dependencies.controller.ts:207`); add `PATCH /api/v1/dependencies/:id {type}` for non-create updates (currently missing).

### 8.3 State & Caching
- **Keyed tags:** `dependencyGraphApi:35` `tagTypes ["DependencyGraph"]` → `{type:"DependencyGraph", id: workspaceId}` and `{type:"ProjectGraph", id: projectId}`; `createDependency` `invalidatesTags` only affected workspace/project instead of string broad invalidation that refetches all.
- **Cross-slice invalidation:** `tasksApi:63` `completeTask` → also `dispatch(dependencyGraphApi.util.invalidateTags(["DependencyGraph"]))` so `blocked` flips correctly (today stale).
- **Entity normalization:** Store `nodes/edges` in `entityAdapter` separate from `tasksApi TaskDTO` to avoid duplicated task data (`store.ts:13` duplication).

### 8.4 Rendering & Interaction (Premium Minimal + Mobile)
- **Desktop/tablet:** Keep `DependencyGraph.tsx` `520px` canvas but **virtualize**: `autoLayout` `O(V+E)` memoized via `useMemo([nodes,edges])` (`DependencyGraph.tsx:74`) already; cap with pagination `graphLimit 150 → displayNodes.slice(0,limit)` (`DependencyGraphPage.tsx:65`) and viewport culling (render only `±viewport`). `onWheel` with `{passive:false}` fix and `onPointerDown` for touch.
- **Mobile:** Promote `DependencyGraphMobile.tsx` (`max-h-[64vh] divide-y`) to primary `block md:hidden` already (`DependencyGraphPage.tsx:262`) but enhance to **chain drawer**: tap node → bottom sheet with `DependencyNode` details + horizontal chain scroll, swipe to dismiss, `View Graph` link becomes `Focus`.
- **Toolbar & Filters:** Keep `OptionMenu` (custom) for `status/priority/project` (`GraphFilters.tsx:69`), search `h-7` with `Search 13px` + `X` clear (`GraphFilters.tsx:48-64`); remove `GraphLegend` border-t clutter, show as inline `dot + label` in header. Add zoom percentage and disable `RotateCcw` when at `scale 1, x 0, y 0`.
- **Details:** Merge `GraphDetailsPanel.tsx` `h-full flex-col overflow-hidden` into a **right rail** (desktop) / **bottom sheet** (mobile) with `Tabs: Overview | Chain | Create` – upstream/downstream lists become single `Chain` tab with `depth` indentation, `Remove` as `ghost` not `bg-zinc-100`.

### 8.5 Workflow Integration
- **Task editor as primary creation surface:** Add `DependencyPicker` (searchable `CommandMenu` over `listTasks` filtered by `!blocked` + `projectId`) to `TaskEditor.tsx` `Organization` section (`TaskEditor.tsx:297`) beside `projectId/goalId` `OptionMenu`; call `create_dependency` tool path `src/lib/ai/tools.ts:889` same service, show `detect_dependency_cycles` live via `zod` + `hasPath` before `Add`.
- **Project workflow:** Move `Dependencies` tab from 5th to 2nd after `Tasks` (`ProjectDetail.tsx:244` `id: dependencies`), surface `Blocked · N` count badge like `Tasks · N` (`ProjectDetail.tsx:205`) using `useGetProjectDependencyGraphQuery`.

### 8.6 AI Integration
- **Single suggest surface:** Consolidate `analyze_project_dependencies` + `suggest_dependencies` into `suggest_dependencies {projectId?}` with `source/target/reason/confidence/sourceHref/targetHref` (current `tools.ts:791` already); add `reason` templating that cites `description` snippet + `dueAt` delta (already in payload `dependency-suggestion.service.ts:72`), persist `ai_runs` with input hash for eval.
- **Planner conversational:** Expose `get_blocked_tasks/get_ready_tasks/get_critical_path` descriptions already cover “What should I work on next?” (`tools.ts:687`) – add `explain_plan` tool that returns why `reasonFor` `Unblocks N · Due today` (`scheduler.ts:72`) was chosen; keep `Preview only — requires confirmation` (`plan_day:587`).

### 8.7 Implementation Guardrails
- **No new packages.** Reuse `lucide-react` `zinc` palette, `radix` via existing `Popover`, `tailwindcss v4` tokens, `mongoose` indexes, `RTK Query` keyed tags.
- **No breaking API.** Keep existing `GET /api/v1/dependencies/graph` and add `PATCH`; keep `analysis` old name as alias.
- **Accessibility:** Keep `Tabs.tsx` roving tabindex (`tabs.tsx:62`) and `OptionMenu` `role=listbox` (`option-menu.tsx:139`), add `aria-label` to `DependencyNode` with `title + status`.

