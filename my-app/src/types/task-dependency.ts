import type { TaskDependencyType } from "@/src/lib/db/enums";

export type { TaskDependencyType };

export interface TaskDependencyDTO {
  id: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TaskDependencyCreateInput {
  predecessorTaskId: string;
  successorTaskId: string;
  type: TaskDependencyType;
}

export interface TaskDependencyFilter {
  taskId?: string;
  predecessorTaskId?: string;
  successorTaskId?: string;
  type?: TaskDependencyType;
}
