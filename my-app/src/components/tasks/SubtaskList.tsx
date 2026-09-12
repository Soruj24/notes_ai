"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { TaskDTO } from "@/src/components/tasks/types";
import {
  useAddSubtaskMutation,
  useRemoveSubtaskMutation,
  useUpdateSubtaskMutation,
} from "@/src/store/tasksApi";

interface SubtaskListProps {
  wid: string;
  task: TaskDTO;
  onTaskChange: (task: TaskDTO) => void;
}

/** Embedded subtasks: add, toggle, remove. Parent owns the task state. */
export function SubtaskList({ wid, task, onTaskChange }: SubtaskListProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [addSubtask, { isLoading }] = useAddSubtaskMutation();
  const [updateSubtask] = useUpdateSubtaskMutation();
  const [removeSubtask] = useRemoveSubtaskMutation();

  const doneCount = task.subtasks.filter((s) => s.done).length;
  const percent = task.subtasks.length === 0 ? 0 : Math.round((doneCount / task.subtasks.length) * 100);

  async function onAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    try {
      onTaskChange(await addSubtask({ wid, id: task.id, title }).unwrap());
    } catch {
      setDraft(title);
      toast("Could not add the subtask.", { tone: "danger" });
    }
  }

  async function mutate(
    subId: string,
    body: Record<string, unknown>,
    error: string,
  ) {
    try {
      onTaskChange(await updateSubtask({ wid, id: task.id, subId, body }).unwrap());
    } catch {
      toast(error, { tone: "danger" });
    }
  }

  async function onRemove(subId: string) {
    try {
      onTaskChange(await removeSubtask({ wid, id: task.id, subId }).unwrap());
    } catch {
      toast("Could not remove the subtask.", { tone: "danger" });
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Subtasks
        </h2>
        <span
          aria-label={`${doneCount} of ${task.subtasks.length} subtasks done`}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-zinc-900 dark:text-zinc-300"
        >
          {doneCount}/{task.subtasks.length}
        </span>
        {task.subtasks.length > 0 ? (
          <span
            aria-hidden="true"
            className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-zinc-100 sm:max-w-48 dark:bg-zinc-800"
          >
            <span
              className="block h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
              style={{ width: `${percent}%` }}
            />
          </span>
        ) : null}
      </div>
      {task.subtasks.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          No subtasks yet — break this task into smaller steps below.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {task.subtasks.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 py-1 pr-1.5 pl-2.5 transition-colors hover:border-zinc-300 focus-within:border-indigo-400 dark:border-zinc-800/80 dark:hover:border-zinc-700"
            >
              <label className="-m-1 flex shrink-0 cursor-pointer items-center justify-center p-1">
                <span className="sr-only">{`Mark subtask "${sub.title}" ${sub.done ? "undone" : "done"}`}</span>
                <input
                  type="checkbox"
                  checked={sub.done}
                  onChange={() => void mutate(sub.id, { done: !sub.done }, "Could not update the subtask.")}
                  aria-label={`Mark subtask "${sub.title}" ${sub.done ? "undone" : "done"}`}
                  className="h-4 w-4 cursor-pointer rounded accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:accent-zinc-100"
                />
              </label>
              <span className={`min-w-0 flex-1 truncate text-sm ${sub.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-800 dark:text-zinc-200"}`}>
                {sub.title}
              </span>
              <button
                type="button"
                onClick={() => void onRemove(sub.id)}
                aria-label={`Remove subtask ${sub.title}`}
                title={`Remove ${sub.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)} className="flex gap-2">
        <Input
          id={`subtask-add-${task.id}`}
          aria-label="Add a subtask"
          placeholder="Add a subtask…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isLoading}
          size="sm"
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={isLoading || !draft.trim()} className="shrink-0">
          <Plus size={13} aria-hidden="true" />
          Add
        </Button>
      </form>
    </div>
  );
}
