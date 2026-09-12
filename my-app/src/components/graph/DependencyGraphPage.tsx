"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useListTasksQuery } from "@/src/store/tasksApi";
import {
  useCreateDependencyMutation,
  useDeleteDependencyMutation,
  useGetDependencyGraphQuery,
  useSuggestProjectDependenciesMutation,
} from "@/src/store/dependencyGraphApi";
import { SuggestedDependencies } from "@/src/components/graph/SuggestedDependencies";
import { DependencyGraph } from "@/src/components/graph/DependencyGraph";
import { GraphFilters, type GraphFilterValues } from "@/src/components/graph/GraphFilters";
import { GraphLegend } from "@/src/components/graph/GraphLegend";
import { GraphDetailsPanel } from "@/src/components/graph/GraphDetailsPanel";
import { GraphEmptyState } from "@/src/components/graph/GraphEmptyState";
import { GraphSkeleton } from "@/src/components/graph/GraphSkeleton";

interface Props { wid: string; }

export function DependencyGraphPage({ wid }: Props) {
  const { data: graph, isLoading, error } = useGetDependencyGraphQuery({ workspaceId: wid });
  const { data: allTasks } = useListTasksQuery({ wid, view: "all" });
  const [createDep, { error: createError }] = useCreateDependencyMutation();
  const [deleteDep] = useDeleteDependencyMutation();
  const [suggest, { isLoading: suggestLoading, error: suggestError }] = useSuggestProjectDependenciesMutation();
  const [suggestions, setSuggestions] = useState<Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }>>([]);

  const searchParams = useSearchParams();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<GraphFilterValues>({ status: "", priority: "", projectId: "", query: "" });

  // Handle ?focus=taskId from Task card "Blocked by" links (deferred to avoid cascading render)
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) queueMicrotask(() => setSelectedNodeId(focus));
  }, [searchParams]);

  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      if (filters.status && n.status !== filters.status) return false;
      if (filters.priority && n.priority !== filters.priority) return false;
      if (filters.projectId && n.projectId !== filters.projectId) return false;
      if (filters.query && !n.title.toLowerCase().includes(filters.query.toLowerCase())) return false;
      return true;
    });
  }, [graph, filters]);

  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    const ids = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter((e) => ids.has(e.predecessorTaskId) && ids.has(e.successorTaskId));
  }, [graph, filteredNodes]);

  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTasks ?? []) if (t.projectId) m.set(t.projectId, t.projectId);
    return [...m.entries()].map(([id]) => ({ id, label: id.slice(0, 8) }));
  }, [allTasks]);

  const selectedNode = useMemo(() => (graph ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null : null), [graph, selectedNodeId]);
  const selectedEdge = useMemo(() => (graph ? graph.edges.find((e) => e.id === selectedEdgeId) ?? null : null), [graph, selectedEdgeId]);

  const dependencies = useMemo(
    () => (selectedNodeId && graph ? graph.edges.filter((e) => e.successorTaskId === selectedNodeId) : []),
    [graph, selectedNodeId],
  );
  const dependents = useMemo(
    () => (selectedNodeId && graph ? graph.edges.filter((e) => e.predecessorTaskId === selectedNodeId) : []),
    [graph, selectedNodeId],
  );
  const taskTitlesMap = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t.title])), [allTasks]);

  if (isLoading) return <GraphSkeleton />;
  if (error) return <div className="rounded-md border border-red-200 p-4 text-sm text-red-600">Failed to load graph</div>;
  if (!graph || graph.nodes.length === 0) return <GraphEmptyState />;

  const handleCreate = async (pre: string, succ: string, type: string) => {
    try {
      await createDep({ workspaceId: wid, predecessorTaskId: pre, successorTaskId: succ, type }).unwrap();
    } catch {
      // error shown via createError
    }
  };
  const handleDelete = async (id: string) => {
    await deleteDep({ id, workspaceId: wid }).unwrap();
    setSelectedEdgeId(null);
  };

  // AI suggestions — must NOT auto-modify DB; local state only until Accept
  const handleAnalyze = async () => {
    const res = await suggest({ workspaceId: wid, projectId: filters.projectId || undefined }).unwrap();
    setSuggestions(res.suggestions ?? []);
  };
  const handleAccept = async (s: { sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }) => {
    try {
      await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
      setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
    } catch {
      // handled via createError
    }
  };
  const handleReject = (s: { sourceTaskId: string; targetTaskId: string }) => {
    setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
  };
  const handleAcceptAll = async () => {
    for (const s of [...suggestions]) {
      try {
        await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
      } catch {
        // per-item error; continue
      }
    }
    setSuggestions([]);
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Dependencies</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Real graph from API – zoom, pan, filter, create and delete edges.</p>
      </div>

      {graph.cycle ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40">
          Cycle detected:{" "}
          {(() => {
            const map = new Map(graph.nodes.map((n) => [n.id, n.title]));
            return graph.cycle.map((id) => map.get(id) ?? id.slice(0, 6)).join(" → ");
          })()}{" "}
          <span className="text-xs opacity-70">({graph.cycle.join(" → ")})</span>
        </div>
      ) : null}

      <GraphFilters values={filters} onChange={setFilters} projectOptions={projectOptions} />
      <GraphLegend />

      {/* AI: Analyze this project dependencies */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAnalyze}
          disabled={suggestLoading}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {suggestLoading ? "Analyzing…" : filters.projectId ? "Analyze this project dependencies" : "Analyze workspace dependencies"}
        </button>
        <span className="text-xs text-zinc-500">AI inspects tasks, goals, descriptions, dates & durations</span>
      </div>

      {suggestError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Failed to generate suggestions. Try again.
        </div>
      ) : null}

      {suggestions.length ? (
        <SuggestedDependencies
          suggestions={suggestions}
          taskTitles={taskTitlesMap}
          onAccept={handleAccept}
          onReject={handleReject}
          onAcceptAll={handleAcceptAll}
          onRejectAll={() => setSuggestions([])}
          isProcessing={suggestLoading}
        />
      ) : null}

      {createError
        ? (() => {
            const data = (createError as { data?: { code?: string; message?: string; cycle?: string[]; errors?: Record<string, string[]>; error?: string } }).data;
            if (data?.code === "CIRCULAR_DEPENDENCY" && data.cycle) {
              const map = new Map((graph.nodes ?? []).map((n) => [n.id, n.title]));
              const named = data.cycle.map((id: string) => map.get(id) ?? id.slice(0, 6)).join(" → ");
              return (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
                  <p className="font-semibold">Circular dependency rejected</p>
                  <p className="mt-1 font-mono text-xs">{named}</p>
                  <p className="mt-1 text-xs opacity-70">{data.cycle.join(" → ")}</p>
                  <p className="mt-1 text-xs">{data.message}</p>
                  <p className="mt-1 text-xs">Edge not saved.</p>
                </div>
              );
            }
            return (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {data?.errors
                  ? JSON.stringify(data.errors)
                  : data?.error ?? data?.message ?? "Create failed (possible cycle or duplicate)"}
              </div>
            );
          })()
        : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <DependencyGraph
          nodes={filteredNodes}
          edges={filteredEdges}
          blocked={graph.blocked}
          criticalPath={graph.criticalPath.path}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            setSelectedEdgeId(null);
          }}
          onSelectEdge={(id) => {
            setSelectedEdgeId(id);
            setSelectedNodeId(null);
          }}
        />
        <GraphDetailsPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onCreate={handleCreate}
          onDeleteEdge={handleDelete}
          onSelectTask={(id) => {
            setSelectedNodeId(id);
            setSelectedEdgeId(null);
          }}
          tasks={allTasks?.map((t) => ({ id: t.id, title: t.title })) ?? []}
          isBlocked={selectedNodeId ? graph.blocked[selectedNodeId] : undefined}
          dependencies={dependencies}
          dependents={dependents}
          onFocus={() => {
            if (selectedNodeId) {
              const id = selectedNodeId;
              setSelectedNodeId(null);
              setTimeout(() => setSelectedNodeId(id), 10);
            }
          }}
        />
      </div>

      <div className="text-xs text-zinc-500">Total {graph.stats.totalTasks} tasks · {graph.stats.totalEdges} edges · {graph.stats.blockedCount} blocked · critical {graph.criticalPath.totalMin}min</div>
    </div>
  );
}
