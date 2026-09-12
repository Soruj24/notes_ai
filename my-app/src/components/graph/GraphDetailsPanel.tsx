"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/src/components/ui/badge";

interface Props {
  selectedNode?: { id: string; title: string; status: string; priority: string } | null;
  selectedEdge?: { id: string; predecessorTaskId: string; successorTaskId: string; type: string } | null;
  onCreate: (pre: string, succ: string, type: string) => void;
  onDeleteEdge: (id: string) => void;
  onSelectTask?: (id: string) => void;
  tasks: Array<{ id: string; title: string; status?: string }>;
  isBlocked?: boolean;
  dependencies?: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: string }>;
  dependents?: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: string }>;
  onFocus?: () => void;
}

export function GraphDetailsPanel({
  selectedNode,
  selectedEdge,
  onCreate,
  onDeleteEdge,
  onSelectTask,
  tasks,
  isBlocked,
  dependencies = [],
  dependents = [],
  onFocus,
}: Props) {
  const [pre, setPre] = useState("");
  const [succ, setSucc] = useState("");
  const [type, setType] = useState("blocks");
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Details</h3>

      {selectedNode ? (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium">{selectedNode.title}</div>
            {onFocus ? (
              <button onClick={onFocus} className="rounded border px-2 py-0.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900">
                Focus
              </button>
            ) : null}
          </div>
          <div className="mt-1 flex gap-1">
            <Badge size="sm">{selectedNode.status}</Badge>
            <Badge size="sm">{selectedNode.priority}</Badge>
            {isBlocked ? <Badge tone="warning" size="sm">blocked</Badge> : <Badge tone="success" size="sm">ready</Badge>}
          </div>
          <div className="mt-2 text-xs text-zinc-500">{selectedNode.id}</div>

          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Dependencies ({dependencies.length})</p>
              <p className="text-[11px] text-zinc-500">Tasks this one depends on (upstream)</p>
              {dependencies.length ? (
                <ul className="mt-1.5 grid gap-1.5">
                  {dependencies.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                      <button
                        onClick={() => onSelectTask?.(d.predecessorTaskId)}
                        className="truncate text-left font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        title="Focus in graph"
                      >
                        {taskMap.get(d.predecessorTaskId) ?? d.predecessorTaskId.slice(0, 6)}
                      </button>
                      <span className="mx-1 text-zinc-400">· {d.type}</span>
                      <button onClick={() => onDeleteEdge(d.id)} className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-zinc-400">No upstream dependencies</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Dependents ({dependents.length})</p>
              <p className="text-[11px] text-zinc-500">Tasks that depend on this (downstream)</p>
              {dependents.length ? (
                <ul className="mt-1.5 grid gap-1.5">
                  {dependents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                      <button
                        onClick={() => onSelectTask?.(d.successorTaskId)}
                        className="truncate text-left font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        title="Focus in graph"
                      >
                        {taskMap.get(d.successorTaskId) ?? d.successorTaskId.slice(0, 6)}
                      </button>
                      <span className="mx-1 text-zinc-400">· {d.type}</span>
                      <button onClick={() => onDeleteEdge(d.id)} className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-zinc-400">No downstream dependents</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Click a task to see details, chain, and dependencies.</p>
      )}

      {selectedEdge ? (
        <div className="mt-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs font-medium">Edge {selectedEdge.id.slice(0, 8)}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {selectedEdge.predecessorTaskId.slice(0, 6)} → {selectedEdge.successorTaskId.slice(0, 6)} · {selectedEdge.type}
          </div>
          <button onClick={() => onDeleteEdge(selectedEdge.id)} className="mt-2 rounded bg-red-600 px-2 py-1 text-xs text-white">
            Delete dependency
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <p className="text-xs font-semibold">Create dependency</p>
        <select value={pre} onChange={(e) => setPre(e.target.value)} className="h-8 rounded border px-2 text-sm">
          <option value="">Predecessor (blocks)</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title.slice(0, 30)}
            </option>
          ))}
        </select>
        <select value={succ} onChange={(e) => setSucc(e.target.value)} className="h-8 rounded border px-2 text-sm">
          <option value="">Successor (blocked)</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title.slice(0, 30)}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-8 rounded border px-2 text-sm">
          <option value="blocks">blocks</option>
          <option value="blocked_by">blocked_by</option>
          <option value="related">related</option>
        </select>
        <button
          onClick={() => pre && succ && onCreate(pre, succ, type)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          disabled={!pre || !succ}
        >
          Add edge
        </button>
      </div>
    </div>
  );
}
