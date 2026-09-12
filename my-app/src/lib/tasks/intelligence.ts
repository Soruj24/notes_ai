"use client";

import { isOverdue, type TaskDTO } from "@/src/components/tasks/types";

export type TaskIntelligenceState = "Blocked" | "Ready" | "In Progress" | "Completed" | "Overdue";

export function getTaskIntelligenceState(
  task: TaskDTO,
  blocked: boolean,
  now = new Date(),
): TaskIntelligenceState {
  if (task.status === "done") return "Completed";
  if (task.status === "archived") return "Completed";
  if (blocked) return "Blocked";
  if (isOverdue(task, now)) return "Overdue";
  if (task.status === "in_progress") return "In Progress";
  return "Ready";
}

export function intelligenceTone(
  state: TaskIntelligenceState,
): "neutral" | "accent" | "success" | "warning" | "danger" {
  switch (state) {
    case "Blocked":
      return "warning";
    case "Overdue":
      return "danger";
    case "Ready":
      return "success";
    case "In Progress":
      return "accent";
    case "Completed":
      return "neutral";
    default:
      return "neutral";
  }
}
