"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { TaskEmptyState } from "@/src/components/tasks/TaskEmptyState";
import { TaskListItem } from "@/src/components/tasks/TaskListItem";
import { TaskSkeleton } from "@/src/components/tasks/TaskSkeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";
import {
  sortTasks,
  type TasksView,
} from "@/src/components/tasks/types";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { useListTasksQuery } from "@/src/store/tasksApi";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";
import { setTaskSearch } from "@/src/store/tasksUiSlice";

interface TaskListProps {
  wid: string;
  view: TasksView;
  projectId?: string;
  goalId?: string;
  hideEmpty?: boolean;
}

/**
 * RTK Query list: cached per (wid, view, filters), refetched on invalidation.
 * Sort + search come from the local UI slice.
 */
export function TaskList({ wid, view, projectId, goalId, hideEmpty }: TaskListProps) {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((s) => s.tasksUi.sort);
  const search = useAppSelector((s) => s.tasksUi.search);
  const deferredSearch = useDeferredValue(search);
  const { data, isLoading, isError, refetch } = useListTasksQuery({
    wid,
    view,
    projectId,
    goalId,
  });
  // Single graph fetch for 1000+ tasks — avoids per-item subscriptions
  const { data: graph } = useGetDependencyGraphQuery({ workspaceId: wid });

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const filtered = (data ?? []).filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q),
    );
    return sortTasks(filtered, sort);
  }, [data, deferredSearch, sort]);

  // Pagination for 100/500/1000+ tasks — avoids rendering all at once
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [view, projectId, goalId, deferredSearch, sort]);
  const paged = useMemo(() => visible.slice(0, page * PAGE_SIZE), [visible, page]);

  if (isLoading) return <TaskSkeleton />;
  if (isError) {
    return (
      <div className="grid gap-2 rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Could not load tasks</p>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Check your connection and try again.
        </p>
        <div>
          <Button size="sm" onClick={() => refetch()} className="mt-1">
            Retry
          </Button>
        </div>
      </div>
    );
  }
  if (visible.length === 0) {
    if (hideEmpty) return null;
    if (search.trim()) {
      return (
        <EmptyState
          icon={<SearchX size={20} aria-hidden="true" />}
          title="No matching tasks"
          description={`Nothing matches “${search.trim()}”. Clear the search to browse everything.`}
          action={
            <Button variant="outline" onClick={() => dispatch(setTaskSearch(""))}>
              Clear search
            </Button>
          }
        />
      );
    }
    return <TaskEmptyState view={view} />;
  }
  const total = data?.length ?? visible.length;
  const hasMore = paged.length < visible.length;
  return (
    <div className="grid gap-2.5">
      <p aria-live="polite" className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
        {deferredSearch.trim()
          ? `${visible.length} of ${total} shown`
          : `${visible.length} ${visible.length === 1 ? "task" : "tasks"}`}
        {hasMore ? ` · showing ${paged.length}` : ""}
      </p>
      <ul className="grid gap-2">
        {paged.map((task) => (
          <TaskListItem key={task.id} wid={wid} task={task} graph={graph} />
        ))}
      </ul>
      {hasMore ? (
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} className="mx-auto">
          Load more ({visible.length - paged.length} remaining)
        </Button>
      ) : null}
    </div>
  );
}
