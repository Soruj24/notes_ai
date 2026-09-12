"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGetProjectDependencyGraphQuery, useGetProjectCriticalPathQuery, useSuggestProjectDependenciesMutation, useCreateDependencyMutation } from "@/src/store/dependencyGraphApi";
import { DependencyGraph } from "@/src/components/graph/DependencyGraph";
import { GraphSkeleton } from "@/src/components/graph/GraphSkeleton";
import { GraphEmptyState } from "@/src/components/graph/GraphEmptyState";
import { SuggestedDependencies } from "@/src/components/graph/SuggestedDependencies";
import { Badge } from "@/src/components/ui/badge";

interface Props {
  wid: string;
  projectId: string;
}

export function ProjectDependenciesTab({ wid, projectId }: Props) {
  const { data: graph, isLoading, error } = useGetProjectDependencyGraphQuery({ workspaceId: wid, projectId });
  const { data: critical, isLoading: criticalLoading } = useGetProjectCriticalPathQuery({ workspaceId: wid, projectId });
  const [suggest, { isLoading: suggestLoading }] = useSuggestProjectDependenciesMutation();
  const [createDep] = useCreateDependencyMutation();
  const [suggestions, setSuggestions] = useState<Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const taskTitles = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n.title])), [graph]);

  const blockedTasks = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => graph.blocked[n.id]);
  }, [graph]);

  const readyTasks = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => !graph.blocked[n.id] && n.status !== "done" && n.status !== "archived");
  }, [graph]);

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

  if (isLoading) return <GraphSkeleton />;
  if (error) return <div className="rounded-md border border-red-200 p-3 text-sm text-red-600">Failed to load project dependencies</div>;
  if (!graph) return <GraphEmptyState />;

  return (
    <div className="grid gap-6">
      {/* Graph - reused global component */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Graph</h3>
        <p className="text-xs text-zinc-500">Project-scoped DAG – reuses global Dependency Graph.</p>
        <div className="mt-3">
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
            />
          )}
        </div>
        {graph.cycle ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Cycle: {graph.cycle.map((id) => taskTitles.get(id) ?? id.slice(0, 6)).join(" → ")}
          </div>
        ) : null}
      </section>

      {/* Blocked Tasks - reuse blocked logic, not duplicated */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold">Blocked Tasks ({blockedTasks.length})</h3>
        {blockedTasks.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No blocked tasks — all ready tasks can start.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {blockedTasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <span className="font-medium">{t.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">Blocked by: {(graph.blockedDetails[t.id] ?? []).map((id) => taskTitles.get(id) ?? id.slice(0, 6)).join(", ") || "—"}</span>
                </div>
                <Link href={`/tasks/${t.id}`} className="text-xs text-indigo-600 hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ready Tasks */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold">Ready Tasks ({readyTasks.length})</h3>
        {readyTasks.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No ready tasks.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {readyTasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span className="font-medium">{t.title}</span>
                <div className="flex gap-1">
                  <Badge tone="success" size="sm">Ready</Badge>
                  <Link href={`/tasks/${t.id}`} className="text-xs text-indigo-600 hover:underline">Open</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Critical Path */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold">Critical Path</h3>
        {criticalLoading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : critical && critical.criticalPath.length ? (
          <div className="mt-2">
            <p className="text-xs text-zinc-500">
              Longest dependency chain: {critical.criticalPath.length} tasks · {critical.totalDuration} min ({critical.totalDurationHours}h)
            </p>
            <ol className="mt-2 grid gap-1.5">
              {critical.criticalTasks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] text-white dark:bg-white dark:text-zinc-900">{i + 1}</span>
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-zinc-500">{t.durationMin ?? 30}m</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">No critical path — no dependencies or cycle detected.</p>
        )}
      </section>

      {/* AI Suggestions - reused global SuggestedDependencies */}
      <section>
        <div className="flex items-center gap-2">
          <button onClick={handleAnalyze} disabled={suggestLoading} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50">
            {suggestLoading ? "Analyzing…" : "AI Suggest Dependencies"}
          </button>
          <span className="text-xs text-zinc-500">Inspects project tasks, descriptions, dates, durations</span>
        </div>
        {suggestions.length ? (
          <div className="mt-3">
            <SuggestedDependencies
              suggestions={suggestions}
              taskTitles={taskTitles}
              onAccept={handleAccept}
              onReject={handleReject}
              onAcceptAll={async () => {
                for (const s of [...suggestions]) {
                  try {
                    await createDep({ workspaceId: wid, predecessorTaskId: s.sourceTaskId, successorTaskId: s.targetTaskId, type: "blocks" }).unwrap();
                  } catch {}
                }
                setSuggestions([]);
              }}
              onRejectAll={() => setSuggestions([])}
              isProcessing={suggestLoading}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
