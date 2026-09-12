"use client";

import { encodeDrag } from "@/src/lib/scheduling/move";
import { cx } from "@/src/lib/utils/cx";
import { formatHour, type ScheduleItemDTO } from "@/src/components/calendar/types";

export const HOUR_PX = 56;

interface EventBlockProps {
  item: ScheduleItemDTO;
  column: number;
  columns: number;
  onSelect: (item: ScheduleItemDTO) => void;
  compact?: boolean;
}

/** Positioned, draggable time-grid block. Drop targets live in TimeGrid. */
export function EventBlock({ item, column, columns, onSelect, compact }: EventBlockProps) {
  const start = new Date(item.start);
  const end = new Date(item.end);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const durationMin = Math.max(15, (end.getTime() - start.getTime()) / 60000);
  const height = Math.max(22, (durationMin / 60) * HOUR_PX - 3);
  const width = 100 / columns;
  const left = column * width;
  const short = height < 40;

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-notoai-schedule", encodeDrag(item));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onSelect(item)}
      aria-label={`${item.kind === "task" ? "Task" : "Event"} ${item.title}, ${formatHour(start)}`}
      className={cx(
        "absolute overflow-hidden rounded-lg border px-1.5 text-left shadow-sm transition-shadow hover:shadow focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500",
        short ? "py-px text-[11px] leading-4" : "py-1 text-xs leading-4",
        item.kind === "task"
          ? "border-amber-600/30 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-100"
          : "border-indigo-600/25 bg-indigo-50 text-indigo-950 dark:border-indigo-400/25 dark:bg-indigo-950 dark:text-indigo-100",
      )}
      style={{
        top: `${(startMin / 60) * HOUR_PX + 1}px`,
        height: `${height}px`,
        left: `calc(${left}% + 3px)`,
        width: `calc(${width}% - 6px)`,
      }}
    >
      <span className="block truncate font-semibold">{item.title}</span>
      {short || compact ? null : (
        <span className="block truncate opacity-70">{formatHour(start)}</span>
      )}
    </button>
  );
}
