"use client";

import { Search, X } from "lucide-react";
import { TaskList } from "@/src/components/tasks/TaskList";
import { TaskQuickAdd } from "@/src/components/tasks/TaskQuickAdd";
import type { TasksView, TaskSort } from "@/src/components/tasks/types";
import { Input } from "@/src/components/ui/input";
import { OptionMenu } from "@/src/components/ui/option-menu";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setTaskSearch, setTaskSort } from "@/src/store/tasksUiSlice";

const copy: Record<TasksView, { title: string; description: string }> = {
  all: { title: "All tasks", description: "Everything open across your workspace." },
  today: { title: "Today", description: "Due today plus anything overdue — clear this first." },
  upcoming: { title: "Upcoming", description: "Future due dates, nearest first." },
  completed: { title: "Completed", description: "Finished work, ready for review." },
  overdue: { title: "Overdue", description: "Past due and waiting — triage these now." },
};

interface TasksPageProps {
  wid: string;
  view: TasksView;
}

/** View shell: title + quick-add + search/sort + cached list. */
export function TasksPage({ wid, view }: TasksPageProps) {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((s) => s.tasksUi.sort);
  const search = useAppSelector((s) => s.tasksUi.search);
  const c = copy[view];
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          {c.title}
        </h1>
        <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{c.description}</p>
      </div>
      {view === "all" ? <TaskQuickAdd wid={wid} /> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="tasks-search"
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => dispatch(setTaskSearch(e.target.value))}
            className="pr-9 pl-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => dispatch(setTaskSearch(""))}
              aria-label="Clear task search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <OptionMenu<TaskSort>
          label="Sort tasks"
          size="md"
          value={sort}
          options={[
            { value: "due", label: "By due date" },
            { value: "priority", label: "By priority" },
            { value: "updated", label: "Recently updated" },
          ]}
          onChange={(next) => dispatch(setTaskSort(next))}
          className="w-full sm:ml-auto sm:w-44"
        />
      </div>
      <TaskList wid={wid} view={view} />
    </div>
  );
}
