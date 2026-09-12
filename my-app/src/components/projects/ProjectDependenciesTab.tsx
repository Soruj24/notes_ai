"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGetProjectDependencyGraphQuery, useGetProjectCriticalPathQuery, useSuggestProjectDependenciesMutation, useCreateDependencyMutation, useDeleteDependencyMutation } from "@/src/store/dependencyGraphApi";
import { useCreateTaskMutation } from "@/src/store/tasksApi";
import { GraphSkeleton } from "@/src/components/graph/GraphSkeleton";
import { GraphEmptyState } from "@/src/components/graph/GraphEmptyState";
import { SuggestedDependencies } from "@/src/components/graph/SuggestedDependencies";
import { GraphDetailsPanel } from "@/src/components/graph/GraphDetailsPanel";

const DependencyGraph = dynamic(() => import("@/src/components/graph/DependencyGraph").then((m) => m.DependencyGraph), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

interface Props {
  wid: string;
  projectId: string;
}

export function ProjectDependenciesTab({ wid, projectId }: Props) {
  const { data: graph, isLoading, error } = useGetProjectDependencyGraphQuery({ workspaceId: wid, projectId });
  const { data: critical, isLoading: criticalLoading } = useGetProjectCriticalPathQuery({ workspaceId: wid, projectId });
  const [suggest, { isLoading: suggestLoading }] = useSuggestProjectDependenciesMutation();
  const [createDep] = useCreateDependencyMutation();
  const [deleteDep] = useDeleteDependencyMutation();
  const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation();
  const [suggestions, setSuggestions] = useState<Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [planPreview, setPlanPreview] = useState<null | { date: string; blocks: Array<{ name: string; items: Array<{ taskId: string; title: string; reason: string }> }> }>(null);
  const [planning, setPlanning] = useState(false);
  const [phaseBy, setPhaseBy] = useState<"level" | "status">("level");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const taskTitles = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n.title])), [graph]);

  const blockedTasks = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => graph.blocked[n.id]);
  }, [graph]);

  const readyTasks = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => !graph.blocked[n.id] && n.status !== "done" && n.status !== "archived");
  }, [graph]);

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

  // Milestones — fetch goals for this project
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; targetDate?: string }>>([]);
  useEffect(() => {
    fetch(`/api/workspaces/${wid}/goals`).then((r) => r.json()).then((j) => {
      const goals = j.goals ?? j.data ?? [];
      const ms = goals.flatMap((g: { milestones?: Array<{ _id?: string; id?: string; title: string; targetDate?: string }> }) => (g.milestones ?? []).map((m) => ({ id: String(m._id ?? m.id), title: m.title, targetDate: m.targetDate })));
      setMilestones(ms.slice(0, 6));
    }).catch(() => {});
  }, [wid]);

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

  const handleAnalyze = async () => {
    const res = await suggest({ workspaceId: wid, projectId }).unwrap();
    setSuggestions(res.suggestions ?? []);
  };

  const handleAccept = async (s: { sourceTaskId: string; targetTaskId: string }) => {
    await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
    setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
  };
  const handleReject = (s: { sourceTaskId: string; targetTaskId: string }) => {
    setSuggestions((prev) => prev.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)));
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    await createTask({ wid, body: { title: newTaskTitle.trim(), projectId } }).unwrap();
    setNewTaskTitle("");
  };

  if (isLoading) return <GraphSkeleton />;
  if (error) return <div className="rounded-md border border-red-200 p-3 text-sm text-red-600">Failed to load project dependencies</div>;
  if (!graph) return <GraphEmptyState />;

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = graph.edges.find((e) => e.id === selectedEdgeId) ?? null;
  const deps = selectedNodeId ? graph.edges.filter((e) => e.successorTaskId === selectedNodeId) : [];
  const dents = selectedNodeId ? graph.edges.filter((e) => e.predecessorTaskId === selectedNodeId) : [];

  return (
    <div className="grid gap-4">
      {/* Project overview + health + progress */}
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Project overview</h3>
            {health ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${health.tone === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : health.tone === "warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-700"}`}>{health.label}</span> : null}
          </div>
          <span className="text-xs tabular-nums text-zinc-500">{graph.stats.totalTasks} tasks · {graph.stats.totalEdges} edges · {graph.stats.blockedCount} blocked · {graph.criticalPath.path.length} critical</span>
        </div>
        <div className="mt-2 flex gap-2 text-xs text-zinc-500">
          <span>Progress: {graph.nodes.filter((n) => n.status === "done").length}/{graph.nodes.length} done</span>
          <span className="text-zinc-300">·</span>
          <span>Critical: {critical?.totalDuration ?? graph.criticalPath.totalMin} min</span>
        </div>
      </div>

      {/* Phases toggle + milestones */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
          <button onClick={() => setPhaseBy("level")} className={`rounded px-2.5 py-1 text-xs font-medium ${phaseBy === "level" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600"}`}>Levels</button>
          <button onClick={() => setPhaseBy("status")} className={`rounded px-2.5 py-1 text-xs font-medium ${phaseBy === "status" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600"}`}>Phases</button>
        </div>
        <span className="text-xs text-zinc-500">Phases: To do → In Progress → Done</span>
      </div>
      {milestones.length ? (
        <div className="flex gap-1.5 overflow-x-auto rounded-md border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          {milestones.map((m) => (
            <span key={m.id} className="inline-flex shrink-0 items-center gap-1.5 rounded border bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-900">
              <span className="h-1.5 w-1.5 rotate-45 bg-zinc-700 dark:bg-zinc-300" />
              {m.title}
              {m.targetDate ? <span className="font-mono text-[11px] text-zinc-500">{new Date(m.targetDate).toLocaleDateString()}</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {/* Inline task creation — without leaving graph */}
      <div className="flex gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTask()} placeholder="Create task in this project…" className="h-7 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-xs placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950" />
        <button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || creatingTask as unknown as boolean} className="h-7 shrink-0 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">Add</button>
      </div>

      {/* Graph - primary workspace, reuses global component */}
      <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {graph.nodes.length === 0 ? (
          <GraphEmptyState />
        ) : (
          <DependencyGraph
            nodes={graph.nodes}
            edges={graph.edges}
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
        )}
      </div>
      {graph.cycle ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Cycle: {graph.cycle.map((id) => taskTitles.get(id) ?? id.slice(0, 6)).join(" → ")}</div>
      ) : null}

      {/* Details + task management — inline without leaving graph */}
      {selectedNode ? (
        <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <GraphDetailsPanel
            wid={wid}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onCreate={async (pre, succ, type) => {
              await createDep({ workspaceId: wid, predecessorTaskId: pre, successorTaskId: succ, type }).unwrap();
            }}
            onDeleteEdge={async (id) => {
              await deleteDep({ id, workspaceId: wid } as never).unwrap();
              setSelectedEdgeId(null);
            }}
            onSelectTask={(id) => {
              setSelectedNodeId(id);
              setSelectedEdgeId(null);
            }}
            tasks={graph.nodes.map((n) => ({ id: n.id, title: n.title }))}
            isBlocked={!!graph.blocked[selectedNode.id]}
            dependencies={deps}
            dependents={dents}
            onFocus={() => {
              const id = selectedNode.id;
              setSelectedNodeId(null);
              setTimeout(() => setSelectedNodeId(id), 10);
            }}
          />
        </div>
      ) : null}

      {/* Blocked / Ready / Critical — reused logic */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Blocked · {blockedTasks.length}</h3>
          {blockedTasks.length === 0 ? <p className="mt-2 text-xs text-zinc-500">No blocked tasks.</p> : (
            <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-md border dark:divide-zinc-800">
              {blockedTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate font-medium">{t.title}</span>
                  <Link href={`/tasks/${t.id}`} className="text-xs text-indigo-600 hover:underline">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Ready · {readyTasks.length}</h3>
          {readyTasks.length === 0 ? <p className="mt-2 text-xs text-zinc-500">No ready tasks.</p> : (
            <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-md border dark:divide-zinc-800">
              {readyTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate font-medium">{t.title}</span>
                  <span className="text-xs text-emerald-600">Ready</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Critical path</h3>
        {criticalLoading ? <p className="mt-2 text-xs text-zinc-500">Loading…</p> : critical && critical.criticalPath.length ? (
          <div className="mt-2">
            <p className="text-xs text-zinc-500">{critical.criticalPath.length} tasks · {critical.totalDuration} min</p>
            <ol className="mt-2 grid gap-1">
              {critical.criticalTasks.slice(0, 6).map((t, i) => (
                <li key={t.id} className="flex items-center gap-2 border-b px-1 py-1.5 text-sm last:border-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">{i + 1}</span>
                  <span className="truncate font-medium">{t.title}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : <p className="mt-2 text-xs text-zinc-500">No critical path.</p>}
      </section>

      {/* AI Planning + Suggestions — without leaving graph */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handlePlanDay} disabled={planning as unknown as boolean} className="h-7 rounded-md border bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          {planning ? "Planning…" : "AI Plan day"}
        </button>
        <button onClick={handleAnalyze} disabled={suggestLoading} className="h-7 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">
          {suggestLoading ? "Analyzing…" : "AI Suggest"}
        </button>
      </div>
      {planPreview ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium">Plan preview — {new Date(planPreview.date).toLocaleDateString()} (not yet applied)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {planPreview.blocks.map((b) => (
              <div key={b.name} className="rounded-md border bg-zinc-50 p-2 dark:bg-zinc-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{b.name}</p>
                <ul className="mt-1 grid gap-1">
                  {b.items.map((it) => <li key={it.taskId} className="truncate text-xs">{it.title} · {it.reason}</li>)}
                  {b.items.length === 0 ? <li className="text-xs text-zinc-400">—</li> : null}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {suggestions.length ? (
        <SuggestedDependencies suggestions={suggestions} taskTitles={taskTitles} onAccept={handleAccept} onReject={handleReject} onAcceptAll={async () => { for (const s of [...suggestions]) await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap(); setSuggestions([]); }} onRejectAll={() => setSuggestions([])} isProcessing={suggestLoading} />
      ) : null}
    </div>
  );
}
