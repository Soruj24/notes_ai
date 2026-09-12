"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DependencyNode } from "@/src/components/graph/DependencyNode";
import { DependencyEdge } from "@/src/components/graph/DependencyEdge";
import { GraphToolbar } from "@/src/components/graph/GraphToolbar";

type Node = { id: string; title: string; status: string; priority: string };
type Edge = { id: string; predecessorTaskId: string; successorTaskId: string; type: string };

interface Props {
  nodes: Node[];
  edges: Edge[];
  blocked?: Record<string, boolean>;
  criticalPath?: string[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
}

const NODE_W = 210;
const NODE_H = 74;
const COL_GAP = 48;
const ROW_GAP = 36;

function autoLayout(nodes: Node[], edges: Edge[]) {
  // Levels via longest path from sources (Kahn topo already implied by blocked graph)
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.predecessorTaskId)?.push(e.successorTaskId);
    indeg.set(e.successorTaskId, (indeg.get(e.successorTaskId) ?? 0) + 1);
  }
  // level = max predecessor level +1
  const level = new Map<string, number>();
  const q: string[] = [];
  for (const [id, d] of indeg) if (d === 0) { q.push(id); level.set(id, 0); }
  let qi = 0;
  while (qi < q.length) {
    const u = q[qi++];
    for (const v of adj.get(u) ?? []) {
      const nl = (level.get(u) ?? 0) + 1;
      if ((level.get(v) ?? -1) < nl) level.set(v, nl);
      const nd = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, nd);
      if (nd === 0) q.push(v);
    }
  }
  // group by level
  const byLevel = new Map<number, string[]>();
  for (const n of nodes) {
    const l = level.get(n.id) ?? 0;
    const arr = byLevel.get(l) ?? [];
    arr.push(n.id);
    byLevel.set(l, arr);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [lvl, ids] of byLevel) {
    ids.forEach((id, idx) => {
      pos.set(id, { x: idx * (NODE_W + COL_GAP) + 24, y: lvl * (NODE_H + ROW_GAP) + 24 });
    });
  }
  // fallback for cycles
  for (const n of nodes) if (!pos.has(n.id)) pos.set(n.id, { x: 24, y: 24 });
  return pos;
}

export function DependencyGraph({ nodes, edges, blocked, criticalPath, selectedNodeId, selectedEdgeId, onSelectNode, onSelectEdge }: Props) {
  const pos = useMemo(() => autoLayout(nodes, edges), [nodes, edges]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [drag, setDrag] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const width = useMemo(() => Math.max(...[...pos.values()].map((p) => p.x), 0) + NODE_W + 48, [pos]);
  const height = useMemo(() => Math.max(...[...pos.values()].map((p) => p.y), 0) + NODE_H + 48, [pos]);

  // Upstream / downstream chain for highlighting
  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    if (!selectedNodeId) return { highlightedNodes: new Set<string>(), highlightedEdges: new Set<string>() };
    const fwd = new Map<string, string[]>();
    const rev = new Map<string, string[]>();
    for (const n of nodes) { fwd.set(n.id, []); rev.set(n.id, []); }
    for (const e of edges) {
      fwd.get(e.predecessorTaskId)?.push(e.successorTaskId);
      rev.get(e.successorTaskId)?.push(e.predecessorTaskId);
    }
    const bfs = (start: string, adj: Map<string, string[]>) => {
      const vis = new Set<string>(); const q = [start];
      while (q.length) { const u = q.shift()!; for (const v of adj.get(u) ?? []) if (!vis.has(v) && v !== start) { vis.add(v); q.push(v); } }
      return vis;
    };
    const up = bfs(selectedNodeId, rev);
    const down = bfs(selectedNodeId, fwd);
    const highlighted = new Set<string>([selectedNodeId, ...up, ...down]);
    const edgeSet = new Set<string>();
    for (const e of edges) if (highlighted.has(e.predecessorTaskId) && highlighted.has(e.successorTaskId)) edgeSet.add(e.id);
    return { highlightedNodes: highlighted, highlightedEdges: edgeSet };
  }, [nodes, edges, selectedNodeId]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const s = Math.min(1.8, Math.max(0.35, t.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { ...t, scale: s };
    });
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    setDrag({ sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    setTransform((t) => ({ ...t, x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) }));
  };
  const onMouseUp = () => setDrag(null);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scale = Math.min(1, (el.clientWidth - 32) / width, (el.clientHeight - 32) / height);
    setTransform({ x: 12, y: 12, scale: Math.max(0.5, scale) });
  }, [width, height]);

  // Focus the selected task — smooth center
  const focusNode = useCallback(
    (id: string) => {
      const p = pos.get(id);
      const el = containerRef.current;
      if (!p || !el) return;
      const scale = transform.scale;
      const cx = el.clientWidth / 2 - (p.x + NODE_W / 2) * scale;
      const cy = el.clientHeight / 2 - (p.y + NODE_H / 2) * scale;
      setTransform((t) => ({ ...t, x: cx, y: cy }));
      setFocusedId(id);
      setTimeout(() => setFocusedId(null), 600);
    },
    [pos, transform.scale],
  );

  useEffect(() => { fit(); }, [fit]);
  useEffect(() => {
    if (selectedNodeId) focusNode(selectedNodeId);
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const criticalSet = useMemo(() => new Set(criticalPath ?? []), [criticalPath]);

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      className="relative h-[520px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="absolute left-2 top-2 z-10 flex gap-1">
        <GraphToolbar
          onZoomIn={() => setTransform((t) => ({ ...t, scale: Math.min(1.8, t.scale * 1.15) }))}
          onZoomOut={() => setTransform((t) => ({ ...t, scale: Math.max(0.35, t.scale * 0.85) }))}
          onFit={fit}
          onReset={() => setTransform({ x: 0, y: 0, scale: 1 })}
        />
        {selectedNodeId ? (
          <button
            onClick={() => focusNode(selectedNodeId)}
            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
          >
            Focus
          </button>
        ) : null}
      </div>

      <div
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "0 0", transition: drag ? undefined : "transform 220ms ease-out" }}
        className="absolute left-0 top-0"
      >
        {/* edges under nodes */}
        <svg width={width} height={height} className="absolute left-0 top-0">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={8} markerHeight={8} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
            </marker>
          </defs>
          {edges.map((e) => {
            const f = pos.get(e.predecessorTaskId);
            const t = pos.get(e.successorTaskId);
            if (!f || !t) return null;
            const highlighted = highlightedEdges.has(e.id);
            const dimmed = !!selectedNodeId && !highlighted && selectedEdgeId !== e.id;
            return (
              <DependencyEdge
                key={e.id}
                id={e.id}
                from={{ x: f.x + NODE_W, y: f.y + NODE_H / 2 }}
                to={{ x: t.x, y: t.y + NODE_H / 2 }}
                selected={selectedEdgeId === e.id}
                highlighted={highlighted}
                dimmed={dimmed}
                onSelect={onSelectEdge}
                type={e.type}
              />
            );
          })}
        </svg>

        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const isSelected = selectedNodeId === n.id;
          const isFocused = focusedId === n.id;
          const isHighlighted = highlightedNodes.has(n.id);
          const dimmed = !!selectedNodeId && !isHighlighted;
          return (
            <DependencyNode
              key={n.id}
              id={n.id}
              title={n.title}
              status={n.status}
              priority={n.priority}
              blocked={blocked?.[n.id]}
              critical={criticalSet.has(n.id)}
              selected={isSelected || isFocused}
              highlighted={isHighlighted && !isSelected}
              dimmed={dimmed}
              onSelect={onSelectNode}
              x={p.x}
              y={p.y}
            />
          );
        })}
      </div>
    </div>
  );
}
