"use client";

import { useMemo } from "react";

type Node = { id: string; title: string; status: string; priority: string };
type Edge = { id: string; predecessorTaskId: string; successorTaskId: string; type: string };

interface Props {
  nodes: Node[];
  edges: Edge[];
  blocked?: Record<string, boolean>;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export function DependencyGraphMobile({ nodes, edges, blocked, selectedNodeId, onSelectNode }: Props) {
  // Build adjacency for upstream/downstream highlighting in list
  const { upstream, downstream } = useMemo(() => {
    if (!selectedNodeId) return { upstream: new Set<string>(), downstream: new Set<string>() };
    const fwd = new Map<string, string[]>();
    const rev = new Map<string, string[]>();
    for (const n of nodes) {
      fwd.set(n.id, []);
      rev.set(n.id, []);
    }
    for (const e of edges) {
      fwd.get(e.predecessorTaskId)?.push(e.successorTaskId);
      rev.get(e.successorTaskId)?.push(e.predecessorTaskId);
    }
    const bfs = (start: string, adj: Map<string, string[]>) => {
      const vis = new Set<string>();
      const q = [start];
      while (q.length) {
        const u = q.shift()!;
        for (const v of adj.get(u) ?? []) if (!vis.has(v) && v !== start) { vis.add(v); q.push(v); }
      }
      return vis;
    };
    return { upstream: bfs(selectedNodeId, rev), downstream: bfs(selectedNodeId, fwd) };
  }, [nodes, edges, selectedNodeId]);

  // Precompute direct predecessors/successors for inline display
  const depMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      const arr = m.get(e.successorTaskId) ?? [];
      arr.push(e.predecessorTaskId);
      m.set(e.successorTaskId, arr);
    }
    return m;
  }, [edges]);
  const succMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      const arr = m.get(e.predecessorTaskId) ?? [];
      arr.push(e.successorTaskId);
      m.set(e.predecessorTaskId, arr);
    }
    return m;
  }, [edges]);

  const titleMap = useMemo(() => new Map(nodes.map((n) => [n.id, n.title])), [nodes]);

  if (nodes.length === 0) {
    return <div className="rounded-md border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">No tasks match filters.</div>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{nodes.length} tasks · tap to focus chain</p>
        {selectedNodeId ? (
          <button onClick={() => onSelectNode(selectedNodeId)} className="text-xs font-medium text-zinc-900 underline dark:text-zinc-100">
            Selected
          </button>
        ) : null}
      </div>

      <div className="max-h-[64vh] overflow-y-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {nodes.map((n) => {
            const isSelected = n.id === selectedNodeId;
            const isUp = upstream.has(n.id);
            const isDown = downstream.has(n.id);
            const isHighlighted = isSelected || isUp || isDown;
            const dimmed = !!selectedNodeId && !isHighlighted;
            const isBlocked = !!blocked?.[n.id];
            return (
              <li
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className={`flex cursor-pointer gap-3 px-3 py-3 transition-colors ${isSelected ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : isHighlighted ? "bg-zinc-50 dark:bg-zinc-900" : "bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"} ${dimmed ? "opacity-40" : ""}`}
              >
                {/* timeline accent */}
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${isBlocked ? "bg-amber-500" : n.status === "done" ? "bg-emerald-500" : "bg-zinc-300"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-medium leading-5 ${isSelected ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"}`}>{n.title}</p>
                  <p className={`truncate text-[11px] ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}>
                    {n.priority} · {n.status}
                    {isBlocked ? " · Blocked" : ""}
                  </p>
                  {/* inline dependencies — minimal, not cluttered */}
                  {(depMap.get(n.id)?.length ?? 0) > 0 || (succMap.get(n.id)?.length ?? 0) > 0 ? (
                    <p className={`mt-1 truncate text-[11px] leading-4 ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>
                      {depMap.get(n.id)?.length ? `Depends on ${depMap.get(n.id)!.slice(0, 2).map((id) => titleMap.get(id) ?? id.slice(0, 6)).join(", ")}` : ""}
                      {depMap.get(n.id)?.length && succMap.get(n.id)?.length ? " · " : ""}
                      {succMap.get(n.id)?.length ? `Blocks ${succMap.get(n.id)!.slice(0, 2).map((id) => titleMap.get(id) ?? id.slice(0, 6)).join(", ")}` : ""}
                    </p>
                  ) : null}
                </div>
                <span className={`shrink-0 self-center font-mono text-[10px] tracking-wide ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>{n.id.slice(0, 4)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="px-1 text-[11px] leading-4 text-zinc-500">Vertical list for thumb reach. Select a task to highlight its upstream and downstream chain. Use filters to narrow 1000+ tasks.</p>
    </div>
  );
}
