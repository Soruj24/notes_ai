import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type ProjectRecord,
} from "@/src/repositories/project.repository";
import { listUserNotes } from "@/src/services/note.service";
import { listUserTasks } from "@/src/services/task.service";
import type { NoteRecord } from "@/src/repositories/note.repository";
import type { TaskRecord } from "@/src/repositories/task.repository";
import type { ProjectStatus } from "@/src/lib/db/enums";
import { progressFromTasks, type Progress } from "@/src/lib/progress";
import { publishDomainEvent } from "@/src/lib/realtime/domain";
import { logActivity } from "@/src/services/activity";
import { requireFlag } from "@/src/lib/features/evaluation";

/** Project use-cases: repository delegation + activity side-effects. */
export async function listUserProjects(
  userId: string,
  workspaceId: string,
  status?: ProjectStatus,
): Promise<ProjectRecord[]> {
  await requireFlag("projects", userId);
  return listProjects(userId, workspaceId, { status });
}

export interface ProjectWithProgress {
  project: ProjectRecord;
  progress: Progress;
}

/** List plus computed progress per project (single round trip). */
export async function listProjectsWithProgress(
  userId: string,
  workspaceId: string,
  status?: ProjectStatus,
): Promise<ProjectWithProgress[]> {
  await requireFlag("projects", userId);
  const projects = await listProjects(userId, workspaceId, { status });
  return Promise.all(
    projects.map(async (project) => {
      const tasks = await listUserTasks(userId, workspaceId, {
        projectId: project.id,
      });
      return { project, progress: progressFromTasks(tasks) };
    }),
  );
}

export async function getUserProject(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<ProjectRecord> {
  await requireFlag("projects", userId);
  return getProject(userId, workspaceId, projectId);
}

export interface ProjectDetail {
  project: ProjectRecord;
  progress: Progress;
  tasks: TaskRecord[];
  notes: NoteRecord[];
}

/** Detail aggregate: project + linked tasks/notes + computed progress. */
export async function getProjectDetail(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<ProjectDetail> {
  await requireFlag("projects", userId);
  const [project, tasks, notes] = await Promise.all([
    getProject(userId, workspaceId, projectId),
    listUserTasks(userId, workspaceId, { projectId }),
    listUserNotes(userId, workspaceId, { projectId }),
  ]);
  return { project, progress: progressFromTasks(tasks), tasks, notes };
}

export async function createUserProject(input: {
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  dueAt?: Date;
  goalId?: string;
}): Promise<ProjectRecord> {
  await requireFlag("projects", input.userId);
  const project = await createProject(input);
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "project",
    entityId: project.id,
  });
  return project;
}

export async function updateUserProject(input: {
  userId: string;
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  dueAt?: Date | null;
  goalId?: string | null;
}): Promise<ProjectRecord> {
  await requireFlag("projects", input.userId);
  const project = await updateProject(input);
  publishDomainEvent("project.updated", {
    workspaceId: input.workspaceId,
    actorId: input.userId,
    entityId: project.id,
  });
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "project",
    entityId: project.id,
  });
  return project;
}

export async function deleteUserProject(
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<void> {
  await requireFlag("projects", userId);
  await deleteProject(userId, workspaceId, projectId);
  const { removeEntityVectors } = await import("@/src/services/semantic.service");
  await removeEntityVectors(workspaceId, "projects", projectId);
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "project",
    entityId: projectId,
  });
}
