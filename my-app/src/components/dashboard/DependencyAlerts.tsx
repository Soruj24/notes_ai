"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";

export function DependencyAlerts({ wid }: { wid: string }) {
  const { data: graph } = useGetDependencyGraphQuery({ workspaceId: wid });

  if (!graph) return null;

  const blockedCount = graph.stats.blockedCount;
  const hasCycle = !!graph.cycle;

  // Most important blocker: task that blocks the most downstream tasks (real graph traversal)
  let topBlocker: { id: string; title: string; count: number } | null = null;
  if (graph.edges.length > 0) {
    const fwd = new Map<string, string[]>();
    for (const n of graph.nodes) fwd.set(n.id, []);
    for (const e of graph.edges) fwd.get(e.predecessorTaskId)?.push(e.successorTaskId);
    const memo = new Map<string, number>();
    const dfs = (id: string, vis = new Set<string>()): number => {
      if (memo.has(id)) return memo.get(id)!;
      if (vis.has(id)) return 0;
      vis.add(id);
      let c = 0;
      for (const succ of fwd.get(id) ?? []) c += 1 + dfs(succ, new Set(vis));
      memo.set(id, c);
      return c;
    };
    for (const n of graph.nodes) dfs(n.id);
    let best: { id: string; title: string; count: number } | null = null;
    for (const n of graph.nodes) {
      const count = memo.get(n.id) ?? 0;
      if (!best || count > best.count) best = { id: n.id, title: n.title, count };
    }
    if (best && best.count > 0) topBlocker = best;
  }

  if (!hasCycle && blockedCount === 0 && !topBlocker) return null;

  return (
    <DashboardSection
      title="Dependency alerts"
      description="Real dependency graph insights"
      icon={<AlertTriangle size={16} aria-hidden="true" />}
      actionHref="/dependencies"
      actionLabel="View graph"
    >
      <div className="grid gap-2 text-sm">
        {blockedCount > 0 ? <p className="text-zinc-700 dark:text-zinc-300">{blockedCount} tasks are blocked.</p> : <p className="text-zinc-500">No blocked tasks.</p>}

        {topBlocker ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Most important blocker</p>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">“{topBlocker.title}”</p>
            <p className="text-xs text-zinc-500">This task blocks {topBlocker.count} other {topBlocker.count === 1 ? "task" : "tasks"}.</p>
            <Link href={`/dependencies?focus=${topBlocker.id}`} className="mt-2 inline-flex text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              View graph →
            </Link>
          </div>
        ) : null}

        {hasCycle ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="font-semibold">Circular dependency detected</p>
            <p className="mt-1 font-mono text-xs">{graph.cycle!.map((id) => (graph.nodes.find((n) => n.id === id)?.title ?? id.slice(0, 6))).join(" → ")}</p>
          </div>
        ) : null}

        <Link href="/dependencies" className="inline-flex w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
          View Graph
        </Link>
      </div>
    </DashboardSection>
  );
}
