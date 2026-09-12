/** Planner UI DTOs (API JSON shapes). */

export interface PlannedItemDTO {
  taskId: string;
  title: string;
  start: string | Date;
  durationMin: number;
  reason: string;
}

export interface PlanBlockDTO {
  name: "Morning" | "Afternoon" | "Evening";
  items: PlannedItemDTO[];
}

export interface UnscheduledDTO {
  taskId: string;
  title: string;
  reason: string;
}

export interface DayPlanDTO {
  date: string | Date;
  blocks: PlanBlockDTO[];
  unscheduled: UnscheduledDTO[];
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEnd(start: string | Date, durationMin: number): string {
  return formatTime(new Date(new Date(start).getTime() + durationMin * 60000));
}
