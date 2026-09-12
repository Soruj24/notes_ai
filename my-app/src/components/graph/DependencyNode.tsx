"use client";

import { Badge } from "@/src/components/ui/badge";

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
}

const statusTone = (s: string) => {
  if (s === "done") return "success" as const;
  if (s === "in_progress") return "accent" as const;
  if (s === "archived") return "neutral" as const;
  return "warning" as const;
};

export function DependencyNode({
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
}: Props & { highlighted?: boolean; dimmed?: boolean }) {
  return (
    <div
      onClick={() => onSelect?.(id)}
      style={
        {
          transform: `translate(${x}px, ${y}px)`,
          opacity: dimmed ? 0.35 : 1,
          filter: dimmed ? "grayscale(0.2)" : undefined,
        } as React.CSSProperties
      }
      className={`absolute w-[210px] cursor-pointer rounded-lg border bg-white p-3 shadow-sm dark:bg-zinc-950 ${
        selected
          ? "border-indigo-600 ring-2 ring-indigo-500/25"
          : highlighted
            ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-700"
            : "border-zinc-200 dark:border-zinc-800"
      } ${blocked ? "opacity-95" : ""} ${critical ? "ring-1 ring-indigo-400" : ""} transition-all duration-200 ease-out`}
    >
      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge tone={statusTone(status)} size="sm">
          {status}
        </Badge>
        <Badge tone="neutral" size="sm">
          {priority}
        </Badge>
        {blocked ? <Badge tone="warning" size="sm">blocked</Badge> : null}
        {critical ? <Badge tone="accent" size="sm">critical</Badge> : null}
        {highlighted && !selected ? <Badge tone="accent" size="sm">chain</Badge> : null}
      </div>
      <div className="mt-1 truncate text-[11px] text-zinc-400">{id.slice(0, 8)}</div>
    </div>
  );
}
