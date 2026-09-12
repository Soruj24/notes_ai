import { expandEvent } from "@/src/lib/scheduling/expand";
import type {
  DateRange,
  EventLike,
  ScheduleItem,
  TaskLike,
} from "@/src/lib/scheduling/types";

/**
 * Normalize events + tasks into one ordered ScheduleItem list.
 * The ONLY place that merges the two systems — views never do this.
 */

function overlaps(start: Date, end: Date, range: DateRange): boolean {
  return end.getTime() >= range.from.getTime() && start.getTime() <= range.to.getTime();
}

export function eventsToItems(events: EventLike[], range: DateRange): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const event of events) {
    for (const occ of expandEvent(event, range)) {
      items.push({
        key: `event:${event.id}:${occ.start.toISOString()}`,
        kind: "event",
        sourceId: event.id,
        title: event.title,
        start: occ.start,
        end: occ.end,
        allDay: event.allDay,
        status: event.status,
        projectId: event.projectId ?? undefined,
        isRecurringInstance: occ.isRecurringInstance || undefined,
      });
    }
  }
  return items;
}

export function tasksToItems(tasks: TaskLike[], range: DateRange): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const task of tasks) {
    if (task.status === "done" || task.status === "archived") continue;
    const due = task.dueAt ? new Date(task.dueAt) : null;
    const start = task.startAt ? new Date(task.startAt) : null;
    if (!due && !start) continue;
    // Point-in-time item: prefer the deadline, else the start.
    const at = due ?? (start as Date);
    const durationMs = (task.durationMin ?? 30) * 60000;
    const itemStart = due && start ? start : new Date(at.getTime() - durationMs);
    const itemEnd = due ?? new Date((start as Date).getTime() + durationMs);
    if (!overlaps(itemStart, itemEnd, range)) continue;
    items.push({
      key: `task:${task.id}`,
      kind: "task",
      sourceId: task.id,
      title: task.title,
      start: itemStart,
      end: itemEnd,
      allDay: !task.startAt && !!task.dueAt && isMidnight(new Date(task.dueAt)),
      status: task.status,
      projectId: task.projectId ?? undefined,
    });
  }
  return items;
}

function isMidnight(d: Date): boolean {
  return (
    d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0
  );
}

export function mergeSchedule(
  events: EventLike[],
  tasks: TaskLike[],
  range: DateRange,
): ScheduleItem[] {
  return [...eventsToItems(events, range), ...tasksToItems(tasks, range)].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
}

export interface LaidOutItem<T> extends Record<string, unknown> {
  item: T;
  column: number;
  columns: number;
}

interface Dated {
  start: string | Date;
  end: string | Date;
}

function time(value: string | Date): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}

/**
 * Overlap layout for time grids: items overlapping in time share columns.
 * Pure function over timed (non-all-day) items of a single day.
 */
export function layoutDayColumns<T extends Dated>(items: T[]): Array<LaidOutItem<T>> {
  const sorted = [...items].sort(
    (a, b) => time(a.start) - time(b.start) || time(b.end) - time(a.end),
  );
  const clusters: T[][] = [];
  for (const item of sorted) {
    const cluster = clusters.find((c) =>
      c.some((o) => time(item.start) < time(o.end) && time(o.start) < time(item.end)),
    );
    if (cluster) cluster.push(item);
    else clusters.push([item]);
  }
  const out: Array<LaidOutItem<T>> = [];
  for (const cluster of clusters) {
    const columnsEnd: number[] = [];
    const placed = new Map<T, number>();
    for (const item of cluster) {
      let col = columnsEnd.findIndex((end) => end <= time(item.start));
      if (col === -1) {
        col = columnsEnd.length;
        columnsEnd.push(0);
      }
      columnsEnd[col] = time(item.end);
      placed.set(item, col);
    }
    for (const item of cluster) {
      out.push({ item, column: placed.get(item) ?? 0, columns: columnsEnd.length });
    }
  }
  return out.sort((a, b) => time(a.item.start) - time(b.item.start));
}
