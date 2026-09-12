import {
  addMilestone,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  removeMilestone,
  updateGoal,
  updateMilestone,
  type GoalRecord,
} from "@/src/repositories/goal.repository";
import { listProjects, type ProjectRecord } from "@/src/repositories/project.repository";
import { listUserTasks } from "@/src/services/task.service";
import type { TaskRecord } from "@/src/repositories/task.repository";
import type { GoalFrequency, GoalStatus } from "@/src/lib/db/enums";
import { goalProgress, type Progress } from "@/src/lib/progress";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Goal use-cases: repository delegation + activity side-effects. */
export async function listUserGoals(
  userId: string,
  workspaceId: string,
  status?: GoalStatus,
): Promise<GoalRecord[]> {
  await requireFlag("goals", userId);
  return listGoals(userId, workspaceId, { status });
}

export interface GoalWithProgress {
  goal: GoalRecord;
  progress: Progress & { source: "tasks" | "milestones" | "manual" };
}

/** List plus computed progress per goal (single round trip). */
export async function listGoalsWithProgress(
  userId: string,
  workspaceId: string,
  status?: GoalStatus,
): Promise<GoalWithProgress[]> {
  await requireFlag("goals", userId);
  const goals = await listGoals(userId, workspaceId, { status });
  return Promise.all(
    goals.map(async (goal) => {
      const detail = await getGoalDetail(userId, workspaceId, goal.id);
      return { goal, progress: detail.progress };
    }),
  );
}

export async function getUserGoal(
  userId: string,
  workspaceId: string,
  goalId: string,
): Promise<GoalRecord> {
  await requireFlag("goals", userId);
  return getGoal(userId, workspaceId, goalId);
}

export interface GoalDetail {
  goal: GoalRecord;
  progress: Progress & { source: "tasks" | "milestones" | "manual" };
  projects: ProjectRecord[];
  tasks: TaskRecord[];
}

/**
 * Detail aggregate honoring Goal → Project → Tasks → Subtasks:
 * progress counts direct tasks plus tasks inside linked projects.
 */
export async function getGoalDetail(
  userId: string,
  workspaceId: string,
  goalId: string,
): Promise<GoalDetail> {
  await requireFlag("goals", userId);
  const [goal, projects, directTasks] = await Promise.all([
    getGoal(userId, workspaceId, goalId),
    listProjects(userId, workspaceId, { goalId }),
    listUserTasks(userId, workspaceId, { goalId }),
  ]);
  const projectTasks = (
    await Promise.all(
      projects.map((p) => listUserTasks(userId, workspaceId, { projectId: p.id })),
    )
  ).flat();
  const seen = new Set(directTasks.map((t) => t.id));
  const tasks = [...directTasks, ...projectTasks.filter((t) => !seen.has(t.id))];
  return {
    goal,
    progress: goalProgress({
      tasks,
      milestones: goal.milestones,
      manual: goal.progress,
    }),
    projects,
    tasks,
  };
}

export async function createUserGoal(input: {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  frequency?: GoalFrequency;
  targetDate?: Date;
}): Promise<GoalRecord> {
  await requireFlag("goals", input.userId);
  const goal = await createGoal(input);
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "goal",
    entityId: goal.id,
  });
  return goal;
}

export async function updateUserGoal(input: {
  userId: string;
  workspaceId: string;
  goalId: string;
  title?: string;
  description?: string;
  status?: GoalStatus;
  frequency?: GoalFrequency;
  targetDate?: Date | null;
  progress?: number;
}): Promise<GoalRecord> {
  await requireFlag("goals", input.userId);
  const goal = await updateGoal(input);
  publishDomainEvent("goal.updated", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: goal.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "goal",
    entityId: goal.id,
  });
  return goal;
}

export async function deleteUserGoal(
  userId: string,
  workspaceId: string,
  goalId: string,
): Promise<void> {
  await requireFlag("goals", userId);
  await deleteGoal(userId, workspaceId, goalId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "goals", goalId);
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "goal",
    entityId: goalId,
  });
}

export async function addGoalMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  input: { title: string; targetDate?: Date },
): Promise<GoalRecord> {
  await requireFlag("goals", userId);
  const goal = await addMilestone(userId, workspaceId, goalId, input);
  publishDomainEvent("goal.updated", {
    workspaceId,
    actorId: userId,
    entityId: goalId,
  });
  return goal;
}

export async function updateGoalMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  milestoneId: string,
  input: { title?: string; done?: boolean; targetDate?: Date | null },
): Promise<GoalRecord> {
  await requireFlag("goals", userId);
  const goal = await updateMilestone(userId, workspaceId, goalId, milestoneId, input);
  publishDomainEvent("goal.updated", {
    workspaceId,
    actorId: userId,
    entityId: goalId,
  });
  return goal;
}

export async function removeGoalMilestone(
  userId: string,
  workspaceId: string,
  goalId: string,
  milestoneId: string,
): Promise<GoalRecord> {
  await requireFlag("goals", userId);
  const goal = await removeMilestone(userId, workspaceId, goalId, milestoneId);
  publishDomainEvent("goal.updated", {
    workspaceId,
    actorId: userId,
    entityId: goalId,
  });
  return goal;
}
