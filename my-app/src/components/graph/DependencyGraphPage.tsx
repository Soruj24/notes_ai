"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useListTasksQuery } from "@/src/store/tasksApi";
import {
  useCreateDependencyMutation,
  useDeleteDependencyMutation,
  useGetDependencyGraphQuery,
  useSuggestProjectDependenciesMutation,
} from "@/src/store/dependencyGraphApi";
import { useCreateTaskMutation } from "@/src/store/tasksApi";
import { SuggestedDependencies } from "@/src/components/graph/SuggestedDependencies";
import { GraphFilters, type GraphFilterValues } from "@/src/components/graph/GraphFilters";
import { GraphLegend } from "@/src/components/graph/GraphLegend";
import { GraphDetailsPanel } from "@/src/components/graph/GraphDetailsPanel";
import { GraphEmptyState } from "@/src/components/graph/GraphEmptyState";
import { GraphSkeleton } from "@/src/components/graph/GraphSkeleton";
import { DependencyGraphMobile } from "@/src/components/graph/DependencyGraphMobile";

const DependencyGraph = dynamic(() => import("@/src/components/graph/DependencyGraph").then((m) => m.DependencyGraph), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

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
  const deferredQuery = useDeferredValue(filters.query);
  const [graphLimit, setGraphLimit] = useState(150);
  const [phaseBy, setPhaseBy] = useState<"level" | "status">("level");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation();

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
      if (deferredQuery && !n.title.toLowerCase().includes(deferredQuery.toLowerCase())) return false;
      return true;
    });
  }, [graph, filters.status, filters.priority, filters.projectId, deferredQuery]);

  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    const ids = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter((e) => ids.has(e.predecessorTaskId) && ids.has(e.successorTaskId));
  }, [graph, filteredNodes]);

  const displayNodes = useMemo(() => filteredNodes.slice(0, graphLimit), [filteredNodes, graphLimit]);
  const displayEdges = useMemo(() => {
    const ids = new Set(displayNodes.map((n) => n.id));
    return filteredEdges.filter((e) => ids.has(e.predecessorTaskId) && ids.has(e.successorTaskId));
  }, [filteredEdges, displayNodes]);

  useEffect(() => {
    queueMicrotask(() => setGraphLimit(150));
  }, [filters.status, filters.priority, filters.projectId, deferredQuery]);

  // Milestones — project phases
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; targetDate?: string }>>([]);
  useEffect(() => {
    fetch(`/api/workspaces/${wid}/goals`).then((r) => r.json()).then((j) => {
      const goals = j.goals ?? j.data ?? [];
      const ms = goals.flatMap((g: { milestones?: Array<{ _id?: string; id?: string; title: string; targetDate?: string; done?: boolean }> }) =>
        (g.milestones ?? []).map((m) => ({ id: String(m._id ?? m.id), title: m.title, targetDate: m.targetDate })),
      );
      setMilestones(ms.slice(0, 6));
    }).catch(() => {});
  }, [wid]);

  // AI Planning — preview without overwriting
  const [planPreview, setPlanPreview] = useState<null | { blocks: Array<{ name: string; items: Array<{ taskId: string; title: string; start: string; reason: string }> }>; date: string }>(null);
  const [planning, setPlanning] = useState(false);
  const handlePlanDay = async () => {
    setPlanning(true);
    try {
      const res = await fetch(`/api/workspaces/${wid}/planner?date=${encodeURIComponent(new Date().toISOString())}`);
      const j = await res.json();
      setPlanPreview(j.plan ?? null);
    } catch {
      setPlanPreview(null);
    } finally {
      setPlanning(false);
    }
  };

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

  const health = useMemo(() => {
    if (!graph) return null;
    const blocked = graph.stats.blockedCount;
    const total = graph.stats.totalTasks;
    const ratio = total ? blocked / total : 0;
    if (graph.cycle) return { label: "Blocked (cycle)", tone: "danger" as const };
    if (ratio > 0.3) return { label: "At risk", tone: "warning" as const };
    if (blocked > 0) return { label: "Needs attention", tone: "warning" as const };
    return { label: "Healthy", tone: "success" as const };
  }, [graph]);

  if (isLoading) return <GraphSkeleton />;
  if (error) return <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800">Failed to load graph</div>;
  if (!graph || graph.nodes.length === 0) return <GraphEmptyState />;

  const handleCreate = async (pre: string, succ: string, type: string) => {
    try {
      await createDep({ workspaceId: wid, predecessorTaskId: pre, successorTaskId: succ, type }).unwrap();
    } catch {}
  };
  const handleDelete = async (id: string) => {
    await deleteDep({ id, workspaceId: wid }).unwrap();
    setSelectedEdgeId(null);
  };

  const handleAnalyze = async () => {
    const res = await suggest({ workspaceId: wid, projectId: filters.projectId || undefined }).unwrap();
    setSuggestions(res.suggestions ?? []);
  };
  const handleAccept = async (s: { sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }) => {
    try {
      await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
      setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
    } catch {}
  };
  const handleReject = (s: { sourceTaskId: string; targetTaskId: string }) => {
    setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
  };
  const handleAcceptAll = async () => {
    for (const s of [...suggestions]) {
      try {
        await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
      } catch {}
    }
    setSuggestions([]);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({ wid, body: { title: newTaskTitle.trim() } }).unwrap();
      setNewTaskTitle("");
    } catch {}
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* Premium header — clear hierarchy, excellent readability */}
      <div className="border-b border-zinc-100 pb-4 dark:border-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Dependencies</h1>
              {health ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${health.tone === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : health.tone === "warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
                  {health.label}
                </span>
              ) : null}
            </div>
            <p className="mt-1 max-w-xl text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">Primary workspace for managing project flow — phases, milestones, dependencies.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] tabular-nums text-zinc-500">
            <span>{graph.stats.totalTasks} tasks</span>
            <span className="text-zinc-300">·</span>
            <span>{graph.stats.totalEdges} edges</span>
            <span className="text-zinc-300">·</span>
            <span>{graph.stats.blockedCount} blocked</span>
            <span className="text-zinc-300">·</span>
            <span>{graph.criticalPath.path.length} critical</span>
          </div>
        </div>
      </div>

      {/* Cycle banner — minimal */}
      {graph.cycle ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-400">Circular dependency</p>
          <p className="mt-1 font-mono text-[11px] leading-4 text-amber-700 dark:text-amber-300">
            {(() => {
              const map = new Map(graph.nodes.map((n) => [n.id, n.title]));
              return graph.cycle.map((id) => map.get(id) ?? id.slice(0, 6)).join(" → ");
            })()}
          </p>
        </div>
      ) : null}

      {/* Filters — minimal bar, custom controls */}
      <div className="mt-4 rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        <GraphFilters values={filters} onChange={setFilters} projectOptions={projectOptions} />
        <div className="mt-2.5">
          <GraphLegend />
        </div>
      </div>

      {/* Phases — status lanes vs dependency levels */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
          <button onClick={() => setPhaseBy("level")} className={`rounded px-2.5 py-1 text-xs font-medium ${phaseBy === "level" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400"}`}>Levels</button>
          <button onClick={() => setPhaseBy("status")} className={`rounded px-2.5 py-1 text-xs font-medium ${phaseBy === "status" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400"}`}>Phases</button>
        </div>
        <span className="text-xs text-zinc-500">Phase lanes: To do → In Progress → Done</span>
      </div>

      {/* Milestones strip */}
      {milestones.length ? (
        <div className="mt-3 flex gap-1.5 overflow-x-auto rounded-md border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          {milestones.map((m) => (
            <span key={m.id} className="inline-flex shrink-0 items-center gap-1.5 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              <span className="h-1.5 w-1.5 rotate-45 bg-zinc-700 dark:bg-zinc-300" aria-hidden="true" />
              {m.title}
              {m.targetDate ? <span className="font-mono text-[11px] text-zinc-500">{new Date(m.targetDate).toLocaleDateString()}</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {/* Inline task creation — manage without leaving graph */}
      <div className="mt-3 flex gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTask()} placeholder="Create task… title" className="h-7 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-xs placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950" />
        <button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || creatingTask} className="h-7 shrink-0 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">Add</button>
      </div>

      {/* AI analyze + AI planning — productivity-focused */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
        <button onClick={handleAnalyze} disabled={suggestLoading} className="h-7 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">
          {suggestLoading ? "Analyzing…" : filters.projectId ? "Analyze project" : "Analyze workspace"}
        </button>
        <span className="text-xs text-zinc-500">AI checks descriptions, dates, durations</span>
        <span className="mx-1 text-zinc-300">·</span>
        <button onClick={handlePlanDay} disabled={planning} className="h-7 rounded-md border bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          {planning ? "Planning…" : "AI Plan day"}
        </button>
      </div>
      {planPreview ? (
        <div className="mt-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Plan preview — {new Date(planPreview.date).toLocaleDateString()} (not yet applied)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {planPreview.blocks.map((b) => (
              <div key={b.name} className="rounded-md border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-900 dark:bg-zinc-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">{b.name}</p>
                <ul className="mt-1 grid gap-1">
                  {b.items.map((it) => (
                    <li key={it.taskId} className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {it.title} · {it.reason}
                    </li>
                  ))}
                  {b.items.length === 0 ? <li className="text-xs text-zinc-400">—</li> : null}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Preview only. Use Apply in Planner to confirm — does not overwrite schedule.</p>
        </div>
      ) : null}

      {suggestError ? <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800">Could not generate suggestions.</div> : null}

      {suggestions.length ? (
        <div className="mt-3">
          <SuggestedDependencies
            suggestions={suggestions}
            taskTitles={taskTitlesMap}
            onAccept={handleAccept}
            onReject={handleReject}
            onAcceptAll={handleAcceptAll}
            onRejectAll={() => setSuggestions([])}
            isProcessing={suggestLoading}
          />
        </div>
      ) : null}

      {createError
        ? (() => {
            const data = (createError as { data?: { code?: string; message?: string; cycle?: string[]; errors?: Record<string, string[]>; error?: string } }).data;
            if (data?.code === "CIRCULAR_DEPENDENCY" && data.cycle) {
              const map = new Map((graph.nodes ?? []).map((n) => [n.id, n.title]));
              const named = data.cycle.map((id: string) => map.get(id) ?? id.slice(0, 6)).join(" → ");
              return (
                <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Circular dependency rejected</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">{named}</p>
                  <p className="mt-1 text-xs text-zinc-500">Edge not saved.</p>
                </div>
              );
            }
            return (
              <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-800">
                {data?.errors ? JSON.stringify(data.errors) : data?.error ?? data?.message ?? "Create failed"}
              </div>
            );
          })()
        : null}

      {filteredNodes.length > 150 ? (
        <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800">
          Showing {displayNodes.length} of {filteredNodes.length}.{" "}
          {displayNodes.length < filteredNodes.length ? (
            <button onClick={() => setGraphLimit((n) => n + 150)} className="font-medium text-zinc-900 underline dark:text-zinc-100">
              Load 150 more
            </button>
          ) : (
            <button onClick={() => setGraphLimit(150)} className="font-medium underline">
              Show less
            </button>
          )}
        </div>
      ) : null}

      {/* Main — desktop: graph + details side-by-side; tablet: stacked; mobile: vertical list */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Desktop/tablet graph — phase lanes */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <DependencyGraph
                nodes={displayNodes}
                edges={displayEdges}
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
                phaseBy={phaseBy}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Pinch or wheel to zoom · drag to pan · tap node to highlight chain</p>
          </div>

          {/* Mobile pattern — vertical list, not shrinking desktop graph */}
          <div className="block md:hidden">
            <DependencyGraphMobile
              nodes={displayNodes}
              edges={displayEdges}
              blocked={graph.blocked}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setSelectedEdgeId(null);
              }}
            />
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <GraphDetailsPanel
            wid={wid}
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
      </div>
    </div>
  );
}
