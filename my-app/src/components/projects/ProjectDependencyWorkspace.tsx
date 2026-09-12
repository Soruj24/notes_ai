"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarDays, Target, Plus, Sparkles } from "lucide-react";
import { useCreateTaskMutation, useListTasksQuery } from "@/src/store/tasksApi";
import { useCreateDependencyMutation, useDeleteDependencyMutation, useGetProjectCriticalPathQuery, useGetProjectDependencyGraphQuery, useSuggestProjectDependenciesMutation } from "@/src/store/dependencyGraphApi";
import { GraphSkeleton } from "@/src/components/graph/GraphSkeleton";
import { GraphEmptyState } from "@/src/components/graph/GraphEmptyState";
import { GraphDetailsPanel } from "@/src/components/graph/GraphDetailsPanel";
import { SuggestedDependencies } from "@/src/components/graph/SuggestedDependencies";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { ProgressRing } from "@/src/components/ui/progress";
import type { ProjectDTO } from "@/src/components/projects/types";

const DependencyGraph = dynamic(() => import("@/src/components/graph/DependencyGraph").then((m) => m.DependencyGraph), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});
const DependencyGraphMobile = dynamic(() => import("@/src/components/graph/DependencyGraphMobile").then((m) => m.DependencyGraphMobile), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

interface Props {
  wid: string;
  project: ProjectDTO & { progress: { percent: number; done: number; total: number } };
}

export function ProjectDependencyWorkspace({ wid, project }: Props) {
  const { data: graph, isLoading, error } = useGetProjectDependencyGraphQuery({ workspaceId: wid, projectId: project.id });
  const { data: critical } = useGetProjectCriticalPathQuery({ workspaceId: wid, projectId: project.id });
  const { data: tasks } = useListTasksQuery({ wid, view: "all", projectId: project.id });
  const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation();
  const [createDep] = useCreateDependencyMutation();
  const [deleteDep] = useDeleteDependencyMutation();
  const [suggest, { isLoading: suggestLoading }] = useSuggestProjectDependenciesMutation();
  const [suggestions, setSuggestions] = useState<Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [phaseBy, setPhaseBy] = useState<"level" | "status">("level");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeStructure, setActiveStructure] = useState<"overview" | "phases" | "tasks" | "milestones">("overview");

  const taskTitles = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n.title])), [graph]);
  const blockedCount = graph?.stats.blockedCount ?? 0;
  const readyCount = useMemo(() => (graph ? graph.nodes.filter((n) => !graph.blocked[n.id] && n.status !== "done" && n.status !== "archived").length : 0), [graph]);
  const health = useMemo(() => {
    if (!graph) return null;
    if (graph.cycle) return { label: "Blocked (cycle)", tone: "danger" as const };
    const ratio = graph.stats.totalTasks ? graph.stats.blockedCount / graph.stats.totalTasks : 0;
    if (ratio > 0.3) return { label: "At risk", tone: "warning" as const };
    if (graph.stats.blockedCount > 0) return { label: "Needs attention", tone: "warning" as const };
    return { label: "Healthy", tone: "success" as const };
  }, [graph]);

  const selectedNode = useMemo(() => (graph ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null : null), [graph, selectedNodeId]);
  const selectedEdge = useMemo(() => (graph ? graph.edges.find((e) => e.id === selectedEdgeId) ?? null : null), [graph, selectedEdgeId]);
  const deps = useMemo(() => (selectedNodeId && graph ? graph.edges.filter((e) => e.successorTaskId === selectedNodeId) : []), [graph, selectedNodeId]);
  const dents = useMemo(() => (selectedNodeId && graph ? graph.edges.filter((e) => e.predecessorTaskId === selectedNodeId) : []), [graph, selectedNodeId]);

  // Milestones
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; targetDate?: string; done?: boolean }>>([]);
  useEffect(() => {
    fetch(`/api/workspaces/${wid}/goals`).then((r) => r.json()).then((j) => {
      const goals = j.goals ?? j.data ?? [];
      const ms = goals.flatMap((g: { milestones?: Array<{ _id?: string; id?: string; title: string; targetDate?: string; done?: boolean }> }) => (g.milestones ?? []).map((m) => ({ id: String(m._id ?? m.id), title: m.title, targetDate: m.targetDate, done: m.done })));
      setMilestones(ms.slice(0, 8));
    }).catch(() => {});
  }, [wid]);

  // Project phase: current phase by status distribution
  const phase = useMemo(() => {
    if (!graph) return "Planning";
    const counts = { todo: 0, in_progress: 0, done: 0 };
    for (const n of graph.nodes) {
      if (n.status === "todo") counts.todo++;
      else if (n.status === "in_progress") counts.in_progress++;
      else if (n.status === "done") counts.done++;
    }
    if (counts.in_progress > 0) return "Execution";
    if (counts.todo === 0 && counts.done > 0) return "Closing";
    return "Planning";
  }, [graph]);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    await createTask({ wid, body: { title: newTaskTitle.trim(), projectId: project.id } }).unwrap();
    setNewTaskTitle("");
  };

  const handlePlan = async () => {
    // AI planning preview — uses planner service dependency-aware (blocked excluded, unblockers prioritized)
    try {
      const res = await fetch(`/api/workspaces/${wid}/planner?date=${encodeURIComponent(new Date().toISOString())}`);
      const j = await res.json();
      // Show in alert for now — in real workspace this would populate preview panels
      if (j.plan) {
        // eslint-disable-next-line no-alert
        alert(`AI Plan preview: ${j.plan.blocks.map((b: { name: string; items: unknown[] }) => `${b.name} ${ (b.items as unknown[]).length}`).join(" | ")} — Preview only, apply in Planner to confirm.`);
      }
    } catch {}
  };

  const handleAnalyze = async () => {
    const res = await suggest({ workspaceId: wid, projectId: project.id }).unwrap();
    setSuggestions(res.suggestions ?? []);
  };

  if (isLoading) return <GraphSkeleton />;
  if (error) return <div className="rounded-md border border-red-200 p-3 text-sm text-red-600">Failed to load project workspace</div>;

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Project Header — always visible */}
      <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <ArrowLeft size={13} />
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white" style={{ backgroundColor: project.color || "#52525b" }}>
              {project.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.name}</h1>
                {health ? (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${health.tone === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" : health.tone === "warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30" : "bg-red-50 text-red-700"}`}>{health.label}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Target size={11} /> {project.progress.done}/{project.progress.total} done
                </span>
                <span className="text-zinc-300">·</span>
                <span>{project.progress.percent}%</span>
                {project.dueAt ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={11} /> Due {new Date(project.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <ProgressRing value={project.progress.percent} size={36} />
              <span className="text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{project.progress.percent}%</span>
            </div>
            <Button size="sm" variant="outline" onClick={handlePlan}>
              <Sparkles size={13} /> AI Plan
            </Button>
            <div className="flex gap-1">
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateTask()} placeholder="Add task…" className="h-8 w-32 rounded-md border border-zinc-200 bg-white px-2 text-xs placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 sm:w-40" />
              <Button size="sm" onClick={handleCreateTask} disabled={!newTaskTitle.trim() || (creatingTask as unknown as boolean)}>
                <Plus size={13} /> Add Task
              </Button>
            </div>
          </div>
        </div>
        {/* Health + phase strip */}
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 py-2 text-xs dark:border-zinc-900">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-900">Phase: {phase}</span>
          <span className="text-zinc-500">Blocked: {blockedCount}</span>
          <span className="text-zinc-300">·</span>
          <span className="text-emerald-700 dark:text-emerald-400">Ready: {readyCount}</span>
          {selectedNode ? <><span className="text-zinc-300">·</span><span className="font-medium text-zinc-900 dark:text-zinc-100">Selected: {selectedNode.title}</span></> : <span className="text-zinc-400">No selection</span>}
        </div>
      </div>

      {/* Main 3-column */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* Left: Project Structure */}
        <div className="lg:col-span-3">
          <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Project Structure</h3>
            </div>
            <div className="grid divide-y divide-zinc-100 dark:divide-zinc-900">
              <button onClick={() => setActiveStructure("overview")} className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 ${activeStructure === "overview" ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}>
                <span className="font-medium">Overview</span>
                <Badge> {project.progress.percent}%</Badge>
              </button>
              <button onClick={() => setActiveStructure("phases")} className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${activeStructure === "phases" ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}>
                <span className="font-medium">Phases</span>
                <span className="text-xs text-zinc-500">{phase}</span>
              </button>
              <button onClick={() => setActiveStructure("tasks")} className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${activeStructure === "tasks" ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}>
                <span className="font-medium">Tasks</span>
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{graph?.stats.totalTasks ?? 0}</span>
              </button>
              <button onClick={() => setActiveStructure("milestones")} className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${activeStructure === "milestones" ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}>
                <span className="font-medium">Milestones</span>
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{milestones.length}</span>
              </button>
            </div>

            <div className="border-t border-zinc-100 p-3 dark:border-zinc-900">
              {activeStructure === "overview" ? (
                <div className="space-y-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  <p>{project.description || "No description."}</p>
                  <div className="flex items-center gap-2">
                    <ProgressRing value={project.progress.percent} size={28} />
                    <span>{project.progress.done}/{project.progress.total} tasks done</span>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${health?.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{health?.label}</span>
                    <span className="text-zinc-500">{blockedCount} blocked · {readyCount} ready</span>
                  </div>
                </div>
              ) : activeStructure === "phases" ? (
                <div className="space-y-2">
                  <div className="inline-flex overflow-hidden rounded-md border p-0.5">
                    <button onClick={() => setPhaseBy("level")} className={`rounded px-2 py-1 text-xs ${phaseBy === "level" ? "bg-zinc-900 text-white" : ""}`}>Levels</button>
                    <button onClick={() => setPhaseBy("status")} className={`rounded px-2 py-1 text-xs ${phaseBy === "status" ? "bg-zinc-900 text-white" : ""}`}>Phases</button>
                  </div>
                  <p className="text-xs text-zinc-500">Phases map to To do → In Progress → Done lanes.</p>
                  <div className="grid gap-1 text-xs">
                    <div className="flex justify-between rounded bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900"><span>To do</span><span>{graph?.nodes.filter((n) => n.status === "todo").length ?? 0}</span></div>
                    <div className="flex justify-between rounded bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900"><span>In Progress</span><span>{graph?.nodes.filter((n) => n.status === "in_progress").length ?? 0}</span></div>
                    <div className="flex justify-between rounded bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900"><span>Done</span><span>{graph?.nodes.filter((n) => n.status === "done").length ?? 0}</span></div>
                  </div>
                </div>
              ) : activeStructure === "tasks" ? (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {(graph?.nodes ?? []).slice(0, 20).map((t) => (
                    <button key={t.id} onClick={() => setSelectedNodeId(t.id)} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 ${selectedNodeId === t.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}>
                      <span className="truncate">{t.title}</span>
                      <span className={`ml-2 h-1.5 w-1.5 shrink-0 rounded-full ${graph?.blocked[t.id] ? "bg-amber-500" : t.status === "done" ? "bg-emerald-500" : "bg-zinc-300"}`} />
                    </button>
                  ))}
                  {(graph?.nodes.length ?? 0) > 20 ? <p className="text-xs text-zinc-500">+{(graph?.nodes.length ?? 0) - 20} more</p> : null}
                </div>
              ) : (
                <div className="space-y-1">
                  {milestones.length ? milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rotate-45 bg-zinc-700" />
                      <span className="flex-1 truncate">{m.title}</span>
                      {m.targetDate ? <span className="font-mono text-[11px] text-zinc-500">{new Date(m.targetDate).toLocaleDateString()}</span> : null}
                    </div>
                  )) : <p className="text-xs text-zinc-500">No milestones. Add in Goals.</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: GRAPH */}
        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {graph && graph.nodes.length === 0 ? <GraphEmptyState /> : (
              <>
                <div className="hidden md:block">
                  <DependencyGraph
                    nodes={graph?.nodes ?? []}
                    edges={graph?.edges ?? []}
                    blocked={graph?.blocked}
                    criticalPath={graph?.criticalPath.path}
                    selectedNodeId={selectedNodeId}
                    selectedEdgeId={selectedEdgeId}
                    onSelectNode={(id) => { setSelectedNodeId(id); setSelectedEdgeId(null); }}
                    onSelectEdge={(id) => { setSelectedEdgeId(id); setSelectedNodeId(null); }}
                    phaseBy={phaseBy}
                  />
                </div>
                <div className="block md:hidden">
                  <DependencyGraphMobile
                    nodes={graph?.nodes ?? []}
                    edges={graph?.edges ?? []}
                    blocked={graph?.blocked}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(id) => { setSelectedNodeId(id); setSelectedEdgeId(null); }}
                  />
                </div>
              </>
            )}
          </div>
          {graph?.cycle ? <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Cycle: {graph.cycle.map((id) => taskTitles.get(id) ?? id.slice(0, 6)).join(" → ")}</div> : null}
          <div className="mt-3">
            <SuggestedDependencies
              suggestions={suggestions}
              taskTitles={taskTitles}
              onAccept={async (s) => { await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap(); setSuggestions((p) => p.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId))); }}
              onReject={(s) => setSuggestions((p) => p.filter((x) => !(x.sourceTaskId === s.sourceTaskId && x.targetTaskId === s.targetTaskId)))}
              onAcceptAll={async () => { for (const s of [...suggestions]) await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap(); setSuggestions([]); }}
              onRejectAll={() => setSuggestions([])}
              isProcessing={suggestLoading}
            />
          </div>
        </div>

        {/* Right: Selected Item */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-6">
            <GraphDetailsPanel
              wid={wid}
              selectedNode={selectedNode}
              selectedEdge={graph?.edges.find((e) => e.id === selectedEdgeId) ?? null}
              onCreate={async (pre, succ, type) => { await createDep({ workspaceId: wid, predecessorTaskId: pre, successorTaskId: succ, type }).unwrap(); }}
              onDeleteEdge={async (id) => { await deleteDep({ id, workspaceId: wid } as never).unwrap(); setSelectedEdgeId(null); }}
              onSelectTask={(id) => { setSelectedNodeId(id); setSelectedEdgeId(null); }}
              tasks={graph?.nodes.map((n) => ({ id: n.id, title: n.title })) ?? []}
              isBlocked={selectedNodeId ? !!graph?.blocked[selectedNodeId] : undefined}
              dependencies={selectedNodeId ? graph?.edges.filter((e) => e.successorTaskId === selectedNodeId) ?? [] : []}
              dependents={selectedNodeId ? graph?.edges.filter((e) => e.predecessorTaskId === selectedNodeId) ?? [] : []}
              onFocus={() => {
                if (selectedNodeId) {
                  const id = selectedNodeId;
                  setSelectedNodeId(null);
                  setTimeout(() => setSelectedNodeId(id), 10);
                }
              }}
            />
            <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Activity</h4>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Recent dependency changes appear here. Create, delete, and reassign are logged via activity.</p>
              <div className="mt-2 text-xs text-zinc-500">
                Blocked: {blockedCount} · Ready: {readyCount} · Critical: {graph?.criticalPath.path.length ?? 0}
              </div>
              <button onClick={async () => {
                const res = await suggest({ workspaceId: wid, projectId: project.id }).unwrap();
                setSuggestions(res.suggestions ?? []);
              }} className="mt-2 w-full rounded-md border bg-white px-2 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800">
                AI Suggest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Toolbar — full width bottom */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white" /> Selected
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> Chain
          <span className="h-0.5 w-4 bg-zinc-300" /> Dependency
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          Use phases to see To do → In Progress → Done lanes. Milestones are diamond anchors.
        </div>
      </div>
    </div>
  );
}
