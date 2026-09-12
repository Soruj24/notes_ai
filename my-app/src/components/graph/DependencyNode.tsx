"use client";

import { memo } from "react";

interface Props {
  id: string;
  title: string;
  status: string;
  priority: string;
  blocked?: boolean;
  critical?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  x: number;
  y: number;
  highlighted?: boolean;
  dimmed?: boolean;
}

const priorityDot: Record<string, string> = {
  low: "bg-zinc-300",
  medium: "bg-zinc-400",
  high: "bg-zinc-700 dark:bg-zinc-500",
  urgent: "bg-zinc-900 dark:bg-zinc-100",
};

const statusLabel: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  archived: "Archived",
};

function DependencyNodeInner({
  id,
  title,
  status,
  priority,
  blocked,
  critical,
  selected,
  highlighted,
  dimmed,
  onSelect,
  x,
  y,
}: Props) {
  return (
    <div
      onClick={() => onSelect?.(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(id);
        }
      }}
      style={
        {
          transform: `translate(${x}px, ${y}px)`,
          opacity: dimmed ? 0.38 : 1,
        } as React.CSSProperties
      }
      className={`absolute flex w-[204px] cursor-pointer select-none overflow-hidden rounded-md border bg-white transition-[border-color,opacity,background] duration-150 ease-out dark:bg-zinc-950 ${
        selected
          ? "border-zinc-900 dark:border-zinc-100"
          : highlighted
            ? "border-zinc-400 dark:border-zinc-600"
            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      {/* subtle left accent */}
      <span
        aria-hidden="true"
        className={`w-[2px] shrink-0 self-stretch ${
          selected ? "bg-zinc-900 dark:bg-zinc-100" : critical ? "bg-zinc-700 dark:bg-zinc-300" : blocked ? "bg-amber-500" : "bg-transparent"
        }`}
      />
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="truncate text-[13px] font-[500] leading-5 tracking-tight text-zinc-900 dark:text-zinc-50">{title}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] leading-4">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[priority] ?? priorityDot.medium}`} aria-hidden="true" />
          <span className="truncate font-medium text-zinc-600 dark:text-zinc-400">{priority}</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="truncate text-zinc-500 dark:text-zinc-500">{statusLabel[status] ?? status}</span>
          {blocked ? (
            <>
              <span className="text-zinc-300">·</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">Blocked</span>
            </>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="truncate font-mono text-[10px] leading-none tracking-wide text-zinc-400">{id.slice(0, 8)}</span>
          {critical ? <span className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-[9px] font-medium tracking-wide text-white dark:bg-white dark:text-zinc-900">CRITICAL</span> : null}
        </div>
      </div>
    </div>
  );
}

export const DependencyNode = memo(DependencyNodeInner);
