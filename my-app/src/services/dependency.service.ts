/**
 * Dependency Service facade — exact names requested:
 * createDependency, deleteDependency, getDependencies, getDependencyGraph,
 * isTaskBlocked, getBlockedTasks, getReadyTasks,
 * detectCircularDependency, getTaskDependencies, getTaskDependents
 *
 * Thin re-export over task-dependency.service.ts (no React, no mock data).
 * All functions delegate to workspace-isolated repository via service.
 */

export {
  createDependency,
  deleteDependency,
  getDependencies,
  getDependencyGraph,
  isTaskBlocked,
  getBlockedTasks,
  getReadyTasks,
  detectCircularDependency,
  getTaskDependencies,
  getTaskDependents,
  // Graph variants
  getTaskDependencyGraph,
  getProjectDependencyGraph,
  type DependencyGraphDTO,
} from "@/src/services/task-dependency.service";
