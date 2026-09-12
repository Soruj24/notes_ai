"use client";

import Link from "next/link";
import { Ban, ArrowRight } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";
import { useListTasksQuery } from "@/src/store/tasksApi";
import { Badge } from "@/src/components/ui/badge";

export function BlockedTasks({ wid }: { wid: string }) {
  const { data: graph, isLoading } = useGetDependencyGraphQuery({ workspaceId: wid });
  const { data: tasks } = useListTasksQuery({ wid, view: "all" });

  if (isLoading) return null;
  if (!graph || graph.stats.blockedCount === 0) return null;

  const map = new Map((tasks ?? []).map((t) => [t.id, t.title]));
  const blockedNodes = graph.nodes.filter((n) => graph.blocked[n.id]);

  // Show up to 5
  const slice = blockedNodes.slice(0, 5);

  return (
    <DashboardSection
      title="Blocked tasks"
      description={`${graph.stats.blockedCount} blocked by dependencies — real graph data`}
      icon={<Ban size={16} aria-hidden="true" />}
      actionHref="/dependencies"
      actionLabel="Open graph"
    >
      <ul className="grid gap-2">
        {slice.map((n) => {
          const deps = graph.blockedDetails[n.id] ?? [];
          return (
            <li key={n.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{n.title}</span>
                <Badge tone="warning" size="sm">Blocked</Badge>
              </div>
              {deps.length ? (
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Blocked by:</span>
                  {deps.map((depId) => (
                    <Link
                      key={depId}
                      href={`/dependencies?focus=${depId}`}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                    >
                      {map.get(depId) ?? depId.slice(0, 6)}
                      <ArrowRight size={11} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {graph.stats.blockedCount > 5 ? (
        <p className="mt-2 text-xs text-zinc-500">+{graph.stats.blockedCount - 5} more blocked</p>
      ) : null}
    </DashboardSection>
  );
}
