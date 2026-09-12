/** Project + goal DTOs (server records and API JSON both fit). */

export interface ProgressDTO {
  done: number;
  total: number;
  percent: number;
}

export interface ProjectDTO {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: string;
  color?: string;
  dueAt?: string | Date;
  goalId?: string;
  progress: ProgressDTO;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MilestoneDTO {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string | Date;
  targetDate?: string | Date;
}

export interface GoalDTO {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: string;
  frequency: string;
  targetDate?: string | Date;
  progress: number;
  milestones: MilestoneDTO[];
  computedProgress: ProgressDTO & { source: "tasks" | "milestones" | "manual" };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LinkOption {
  id: string;
  label: string;
}

export function isOverdueDue(dueAt: string | Date | undefined, now = new Date()): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < now.getTime();
}
