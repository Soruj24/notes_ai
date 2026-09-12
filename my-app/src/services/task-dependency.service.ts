import type { TaskDependencyType } from "@/src/lib/db/enums";
import { CircularDependencyError, NotFoundError } from "@/src/lib/db/errors";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import {
  createTaskDependency,
  deleteTaskDependency,
  getTaskDependency,
  listDependenciesForTask,
  listTaskDependencies,
  type TaskDependencyRecord,
} from "@/src/repositories/task-dependency.repository";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";
import { blockedClosure, buildAdj, buildBlockedAdj, detectCycle, hasPath, topologicalSort } from "@/src/lib/graph/dag";
import { computeCriticalPath } from "@/src/lib/graph/critical-path";

/**
 * Task dependency use-cases.
 * Thin service layer — repository delegation, realtime events, activity logs.
 * No dependency logic lives in React components; this layer is the single
 * writer path the API handlers call.
 */

export async function detectCircularDependency(
  userId: string,
  workspaceId: string,
  predecessorTaskId: string,
  successorTaskId: string,
): Promise<{ hasCycle: boolean; cycle: string[] | null }> {
  await requireFlag("tasks", userId);
  // Workspace isolation via existing list call (requires membership)
  const deps = await listTaskDependencies(userId, workspaceId);
  // Build forward graph: predecessor → successor
  const adj = buildAdj(deps as never);
  if (!adj.has(predecessorTaskId)) adj.set(predecessorTaskId, []);
  if (!adj.has(successorTaskId)) adj.set(successorTaskId, []);
  // Robust check: if B already reaches A, then A→B would create a cycle
  // This is the primary guard before creating A → B
  if (hasPath(adj, successorTaskId, predecessorTaskId)) {
    // Construct cycle by finding path B → … → A, then add A → B edge to close loop
    const path = findPath(adj, successorTaskId, predecessorTaskId) ?? [successorTaskId, predecessorTaskId];
    const cycle = [...path, successorTaskId]; // close loop: A → B → … → A
    // For consistency with detectCycle, find full cycle that includes new edge
    const hypothetical = { predecessorTaskId, successorTaskId };
    const all = [...deps, hypothetical as never];
    const adj2 = buildAdj(all as never);
    const detected = detectCycle(adj2);
    return { hasCycle: true, cycle: detected ?? cycle };
  }
  // Also detect any existing cycle (shouldn't happen, but guard)
  const existingCycle = detectCycle(adj);
  if (existingCycle) return { hasCycle: true, cycle: existingCycle };
  // Hypothetical full check (covers new edge transitive)
  const hypothetical = { predecessorTaskId, successorTaskId };
  const all = [...deps, hypothetical as never];
  const adj2 = buildAdj(all as never);
  const cycle = detectCycle(adj2);
  return { hasCycle: !!cycle, cycle };
}

// BFS to reconstruct path for cycle message
function findPath(adj: Map<string, string[]>, from: string, to: string): string[] | null {
  const queue: string[][] = [[from]];
  const visited = new Set<string>([from]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === to) return path;
    for (const nb of adj.get(last) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push([...path, nb]);
      }
    }
  }
  return null;
}

export async function createUserTaskDependency(input: {
  userId: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
}): Promise<TaskDependencyRecord> {
  await requireFlag("tasks", input.userId);
  // Robust guard: if B already reaches A, then A → B would create cycle A → B → … → A
  const { hasCycle, cycle } = await detectCircularDependency(
    input.userId,
    input.workspaceId,
    input.predecessorTaskId,
    input.successorTaskId,
  );
  if (hasCycle && cycle) {
    throw new CircularDependencyError(cycle, `Circular dependency detected: ${cycle.join(" → ")}`);
  }
  const dep = await createTaskDependency(input);

  publishDomainEvent("task.dependency.added", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: dep.id,
  });

  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "task",
    entityId: input.successorTaskId,
    metadata: {
      dependencyId: dep.id,
      predecessorTaskId: dep.predecessorTaskId,
      successorTaskId: dep.successorTaskId,
      type: dep.type,
    },
  });

  return dep;
}

export async function listUserTaskDependencies(
  userId: string,
  workspaceId: string,
  filter: { taskId?: string; type?: TaskDependencyType } = {},
): Promise<TaskDependencyRecord[]> {
  await requireFlag("tasks", userId);
  return listTaskDependencies(userId, workspaceId, filter);
}

export async function listUserDependenciesForTask(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<{ incoming: TaskDependencyRecord[]; outgoing: TaskDependencyRecord[] }> {
  await requireFlag("tasks", userId);
  return listDependenciesForTask(userId, workspaceId, taskId);
}

export async function getUserTaskDependency(
  userId: string,
  workspaceId: string,
  dependencyId: string,
): Promise<TaskDependencyRecord> {
  await requireFlag("tasks", userId);
  return getTaskDependency(userId, workspaceId, dependencyId);
}

export async function deleteUserTaskDependency(
  userId: string,
  workspaceId: string,
  dependencyId: string,
): Promise<void> {
  await requireFlag("tasks", userId);

  // Fetch before delete for activity payload
  const dep = await getTaskDependency(userId, workspaceId, dependencyId);
  await deleteTaskDependency(userId, workspaceId, dependencyId);

  publishDomainEvent("task.dependency.removed", {
    workspaceId,
    actorId: userId,
    entityId: dep.id,
  });

  await logActivity({
    workspaceId,
    actorId: userId,
    action: "updated",
    entityType: "task",
    entityId: dep.successorTaskId,
    metadata: {
      dependencyId: dep.id,
      predecessorTaskId: dep.predecessorTaskId,
      successorTaskId: dep.successorTaskId,
      type: dep.type,
      removed: true,
    },
  });
}

export interface DependencyGraphDTO {
  nodes: Array<{
    id: string;
    title: string;
    status: string;
    projectId?: string;
    priority: string;
    durationMin?: number;
  }>;
  edges: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: TaskDependencyType }>;
  blocked: Record<string, boolean>;
  blockedDetails: Record<string, string[]>;
  cycle: string[] | null;
  topologicalOrder: string[] | null;
  criticalPath: { path: string[]; totalMin: number };
  stats: { totalTasks: number; totalEdges: number; blockedCount: number };
}

async function buildGraph(
  userId: string,
  workspaceId: string,
  projectId?: string,
): Promise<DependencyGraphDTO> {
  await requireFlag("tasks", userId);

  // Optimized for scale: select only needed fields, capped at 1000 nodes / 2000 edges, lean.
  const { listTasksForGraph } = await import("@/src/repositories/task.repository");
  const { listDependenciesForGraph } = await import("@/src/repositories/task-dependency.repository");

  // Fetch tasks and dependencies in parallel — both workspace-isolated and indexed.
  const [tasks, deps] = await Promise.all([
    listTasksForGraph(userId, workspaceId, projectId ? { projectId } : {}),
    listDependenciesForGraph(userId, workspaceId),
  ]);

  // Project graph: filter edges to those where both endpoints belong to project-scoped tasks
  const taskIds = new Set(tasks.map((t) => t.id));
  const filteredDeps = projectId
    ? deps.filter((d) => taskIds.has(d.predecessorTaskId) && taskIds.has(d.successorTaskId))
    : deps;

  const forwardAdj = buildAdj(filteredDeps);
  // Ensure isolated nodes appear
  for (const t of tasks) if (!forwardAdj.has(t.id)) forwardAdj.set(t.id, []);

  const blockedAdj = buildBlockedAdj(filteredDeps);
  for (const t of tasks) if (!blockedAdj.has(t.id)) blockedAdj.set(t.id, []);

  const done = new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
  const blockedMap = blockedClosure(blockedAdj, done);
  const cycle = detectCycle(forwardAdj);
  const topo = cycle ? null : topologicalSort(forwardAdj);

  const durations = new Map<string, number>();
  for (const t of tasks) durations.set(t.id, t.durationMin ?? 30);

  const criticalPath =
    topo && topo.length
      ? computeCriticalPath(forwardAdj, durations, topo)
      : { path: [], totalMin: 0 };

  const blockedDetails: Record<string, string[]> = {};
  for (const [id, isBlocked] of blockedMap) {
    if (isBlocked) blockedDetails[id] = blockedAdj.get(id) ?? [];
  }

  const blocked: Record<string, boolean> = {};
  for (const [k, v] of blockedMap) blocked[k] = v;

  return {
    nodes: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      projectId: t.projectId,
      priority: t.priority,
      durationMin: t.durationMin,
    })),
    edges: filteredDeps.map((d) => ({
      id: d.id,
      predecessorTaskId: d.predecessorTaskId,
      successorTaskId: d.successorTaskId,
      type: d.type,
    })),
    blocked,
    blockedDetails,
    cycle,
    topologicalOrder: topo,
    criticalPath,
    stats: {
      totalTasks: tasks.length,
      totalEdges: filteredDeps.length,
      blockedCount: [...blockedMap.values()].filter(Boolean).length,
    },
  };
}

export async function getTaskDependencyGraph(
  userId: string,
  workspaceId: string,
): Promise<DependencyGraphDTO> {
  return buildGraph(userId, workspaceId);
}

export async function getProjectDependencyGraph(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<DependencyGraphDTO> {
  // Validate project exists and belongs to workspace (workspace isolation)
  const { getProject } = await import("@/src/repositories/project.repository");
  try {
    await getProject(userId, workspaceId, projectId);
  } catch (e) {
    if (e instanceof NotFoundError) throw new NotFoundError("Project not found in this workspace.");
    throw e;
  }
  return buildGraph(userId, workspaceId, projectId);
}

// ---------------------------------------------------------------------------
// Required Dependency Service API — graph-traversal based, no mock data
// ---------------------------------------------------------------------------

export async function createDependency(input: {
  userId: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
}): Promise<TaskDependencyRecord> {
  return createUserTaskDependency(input);
}

export async function deleteDependency(
  userId: string,
  workspaceId: string,
  dependencyId: string,
): Promise<void> {
  return deleteUserTaskDependency(userId, workspaceId, dependencyId);
}

export async function getDependencies(
  userId: string,
  workspaceId: string,
  filter: { taskId?: string; type?: TaskDependencyType } = {},
): Promise<TaskDependencyRecord[]> {
  return listUserTaskDependencies(userId, workspaceId, filter);
}

export async function getDependencyGraph(
  userId: string,
  workspaceId: string,
): Promise<DependencyGraphDTO> {
  return getTaskDependencyGraph(userId, workspaceId);
}

/**
 * A task is blocked when one or more blocking predecessor tasks are not completed.
 * Uses graph traversal: builds blockedAdj (successor → predecessors) and
 * computes blockedClosure (transitive). A predecessor that is itself blocked
 * transitively blocks the successor.
 */
export async function isTaskBlocked(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<boolean> {
  await requireFlag("tasks", userId);
  const graph = await buildGraph(userId, workspaceId);
  return graph.blocked[taskId] ?? false;
}

export async function getBlockedTasks(
  userId: string,
  workspaceId: string,
): Promise<Array<{ id: string; title: string; status: string; blockedBy: string[] }>> {
  const graph = await buildGraph(userId, workspaceId);
  const blockedIds = Object.entries(graph.blocked)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const blockedSet = new Set(blockedIds);
  return graph.nodes
    .filter((n) => blockedSet.has(n.id))
    .map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status,
      blockedBy: graph.blockedDetails[n.id] ?? [],
    }));
}

export async function getReadyTasks(
  userId: string,
  workspaceId: string,
): Promise<Array<{ id: string; title: string; status: string }>> {
  const graph = await buildGraph(userId, workspaceId);
  // Ready = not blocked, not done/archived, and all blocking predecessors completed
  return graph.nodes.filter(
    (n) => !graph.blocked[n.id] && n.status !== "done" && n.status !== "archived",
  );
}

export async function getTaskDependencies(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<TaskDependencyRecord[]> {
  const { incoming } = await listUserDependenciesForTask(userId, workspaceId, taskId);
  return incoming;
}

export async function getTaskDependents(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<TaskDependencyRecord[]> {
  const { outgoing } = await listUserDependenciesForTask(userId, workspaceId, taskId);
  return outgoing;
}

// Full pair (kept for controllers)
export async function getTaskDependencyPair(
  userId: string,
  workspaceId: string,
  taskId: string,
): Promise<{ incoming: TaskDependencyRecord[]; outgoing: TaskDependencyRecord[] }> {
  return listUserDependenciesForTask(userId, workspaceId, taskId);
}

export interface CriticalPathDTO {
  criticalTasks: Array<{
    id: string;
    title: string;
    status: string;
    durationMin?: number;
    projectId?: string;
  }>;
  criticalPath: string[];
  totalDuration: number; // minutes
  totalDurationHours: number;
  dependencyChainsCount?: number;
}

/**
 * Critical path for a project — analyzes DAG, finds longest dependency path
 * by estimated duration (durationMin fallback 30). If cycle exists, throws
 * CircularDependencyError and does not calculate.
 */
export async function getProjectCriticalPath(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<CriticalPathDTO> {
  const graph = await getProjectDependencyGraph(userId, workspaceId, projectId);
  if (graph.cycle) {
    throw new CircularDependencyError(
      graph.cycle,
      `Cannot calculate critical path: circular dependency detected: ${graph.cycle.join(" → ")}`,
    );
  }
  // If no topological order (should not happen after cycle check), treat as error
  if (!graph.topologicalOrder) {
    throw new CircularDependencyError([], "Cannot calculate critical path: graph has cycle.");
  }
  // Map nodes for fast lookup
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const criticalTasks = graph.criticalPath.path.map((id) => {
    const n = nodeMap.get(id);
    return n ? { id: n.id, title: n.title, status: n.status, durationMin: n.durationMin, projectId: n.projectId } : { id, title: id, status: "unknown" };
  });
  return {
    criticalTasks,
    criticalPath: graph.criticalPath.path,
    totalDuration: graph.criticalPath.totalMin,
    totalDurationHours: Math.round((graph.criticalPath.totalMin / 60) * 10) / 10,
    dependencyChainsCount: graph.stats.totalEdges,
  };
}
