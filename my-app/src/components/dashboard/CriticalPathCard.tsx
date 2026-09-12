"use client";

import Link from "next/link";
import { Route } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";

export function CriticalPathCard({ wid }: { wid: string }) {
  const { data: graph, isLoading } = useGetDependencyGraphQuery({ workspaceId: wid });

  if (isLoading) return null;
  if (!graph || graph.criticalPath.path.length === 0) return null;

  const titles = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const path = graph.criticalPath.path;

  return (
    <DashboardSection
      title="Critical path"
      description={`Longest dependency chain · ${graph.criticalPath.totalMin} min (${Math.round((graph.criticalPath.totalMin / 60) * 10) / 10}h)`}
      icon={<Route size={16} aria-hidden="true" />}
      actionHref="/dependencies"
      actionLabel="View graph"
    >
      <ol className="grid gap-1.5">
        {path.slice(0, 6).map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-zinc-950">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
              {i + 1}
            </span>
            <Link href={`/tasks/${id}`} className="truncate text-sm font-medium hover:underline">
              {titles.get(id) ?? id.slice(0, 8)}
            </Link>
            <span className="ml-auto text-xs text-zinc-500">{graph.nodes.find((n) => n.id === id)?.durationMin ?? 30}m</span>
          </li>
        ))}
      </ol>
      {path.length > 6 ? <p className="mt-2 text-xs text-zinc-500">+{path.length - 6} more in critical path</p> : null}
    </DashboardSection>
  );
}
