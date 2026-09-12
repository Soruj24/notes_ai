"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Repeat } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { useToast } from "@/src/components/ui/toast";
import {
  formatDue,
  isOverdue,
  subtaskProgress,
  type TaskDTO,
} from "@/src/components/tasks/types";
import { useCompleteTaskMutation, useReopenTaskMutation } from "@/src/store/tasksApi";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";
import { getTaskIntelligenceState, intelligenceTone } from "@/src/lib/tasks/intelligence";
import { cx } from "@/src/lib/utils/cx";

const priorityTone: Record<string, "neutral" | "accent" | "warning" | "danger"> = {
  low: "neutral",
  medium: "neutral",
  high: "warning",
  urgent: "danger",
};

const priorityDot: Record<string, string> = {
  low: "bg-zinc-300 dark:bg-zinc-700",
  medium: "bg-indigo-400",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

interface TaskListItemProps {
  wid: string;
  task: TaskDTO;
}

/** Task row with instant local checkbox + RTK mutation behind it + blocked intelligence. */
export function TaskListItem({ wid, task }: TaskListItemProps) {
  const { toast } = useToast();
  const [completeTask] = useCompleteTaskMutation();
  const [reopenTask] = useReopenTaskMutation();
  const { data: graph } = useGetDependencyGraphQuery({ workspaceId: wid });
  // Local mirror for instant feedback; server is source of truth on refetch.
  const [done, setDone] = useState(task.status === "done");
  const overdue = !done && isOverdue(task);
  const progress = subtaskProgress(task);

  // Real dependency data — never mock
  const blocked = useMemo(() => !!graph?.blocked[task.id], [graph, task.id]);
  const blockedByIds: string[] = useMemo(() => graph?.blockedDetails[task.id] ?? [], [graph, task.id]);
  const blockedByNames = useMemo(() => {
    if (!graph) return [] as Array<{ id: string; title: string }>;
    const map = new Map(graph.nodes.map((n) => [n.id, n.title]));
    return blockedByIds.map((id) => ({ id, title: map.get(id) ?? id.slice(0, 8) }));
  }, [graph, blockedByIds]);
  const intelligence = getTaskIntelligenceState(task, blocked);

  async function onToggle() {
    const next = !done;
    setDone(next);
    try {
      if (next) {
        await completeTask({ wid, id: task.id }).unwrap();
      } else {
        await reopenTask({ wid, id: task.id }).unwrap();
      }
    } catch {
      setDone(!next);
      toast("Could not update the task.", { tone: "danger" });
    }
  }

  return (
    <li
      className={cx(
        "rounded-xl border bg-white transition-[border-color,box-shadow] hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)] focus-within:border-indigo-400 dark:bg-zinc-950 dark:focus-within:border-indigo-400",
        overdue
          ? "border-red-300 hover:border-red-400 dark:border-red-900/70 dark:hover:border-red-800"
          : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
        done && "opacity-75",
      )}
    >
      <div className="flex items-start gap-2.5 p-3.5">
        <label className="-m-1.5 flex shrink-0 cursor-pointer items-center justify-center p-1.5">
          <span className="sr-only">{`Mark "${task.title}" as ${done ? "todo" : "done"}`}</span>
          <input
            type="checkbox"
            checked={done}
            onChange={() => void onToggle()}
            aria-label={`Mark "${task.title}" as ${done ? "todo" : "done"}`}
            className="h-5 w-5 shrink-0 cursor-pointer rounded-md accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:accent-zinc-100"
          />
        </label>
        <Link
          href={`/tasks/${task.id}`}
          className="min-w-0 flex-1 rounded-md py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <p
            className={cx(
              "flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50",
              done && "text-zinc-400 line-through dark:text-zinc-500",
            )}
          >
            <span
              aria-hidden="true"
              title={`${task.priority} priority`}
              className={cx("h-2 w-2 shrink-0 rounded-full", priorityDot[task.priority] ?? priorityDot.medium)}
            />
            <span className="min-w-0 truncate">{task.title}</span>
          </p>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Badge size="sm" tone={intelligenceTone(intelligence)}>{intelligence}</Badge>
            <span
              className={cx(
                "inline-flex items-center gap-1 tabular-nums",
                overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              <CalendarDays size={12} aria-hidden="true" />
              {overdue ? `Overdue · ${formatDue(task.dueAt)}` : formatDue(task.dueAt)}
            </span>
            <Badge size="sm" tone={priorityTone[task.priority] ?? "neutral"}>
              {task.priority}
            </Badge>
            {task.recurrence !== "none" ? (
              <Badge size="sm" tone="accent">
                <Repeat size={11} aria-hidden="true" className="inline" /> {task.recurrence}
              </Badge>
            ) : null}
            {progress.total > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <span
                  aria-hidden="true"
                  className="h-1 w-12 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                >
                  <span
                    className="block h-full rounded-full bg-zinc-500 dark:bg-zinc-400"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </span>
                {progress.done}/{progress.total}
              </span>
            ) : null}
          </span>
          {blocked && blockedByNames.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Blocked by:</span>
              {blockedByNames.map((b, i) => (
                <span key={b.id} className="inline-flex items-center gap-1">
                  {i > 0 ? <span>·</span> : null}
                  <Link
                    href={`/dependencies?focus=${b.id}`}
                    className="rounded px-1 py-0.5 font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:bg-indigo-50 dark:text-indigo-400 dark:decoration-indigo-700"
                    title={`Focus ${b.title} in graph`}
                  >
                    {b.title}
                  </Link>
                </span>
              ))}
            </div>
          ) : null}
        </Link>
      </div>
    </li>
  );
}
