"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { useGetDependencyGraphQuery } from "@/src/store/dependencyGraphApi";
import { Badge } from "@/src/components/ui/badge";

export function ReadyToStart({ wid }: { wid: string }) {
  const { data: graph, isLoading } = useGetDependencyGraphQuery({ workspaceId: wid });

  if (isLoading) return null;
  if (!graph) return null;

  const ready = graph.nodes.filter((n) => !graph.blocked[n.id] && n.status !== "done" && n.status !== "archived");

  if (ready.length === 0) return null;

  const slice = ready.slice(0, 5);

  return (
    <DashboardSection
      title="Ready to start"
      description={`${ready.length} tasks with dependencies satisfied — real graph data`}
      icon={<CheckCircle2 size={16} aria-hidden="true" />}
      actionHref="/dependencies"
      actionLabel="View graph"
    >
      <ul className="grid gap-2">
        {slice.map((n) => (
          <li key={n.id} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/15">
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{n.title}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge tone="success" size="sm">Ready</Badge>
              <Link href={`/tasks/${n.id}`} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Open</Link>
            </div>
          </li>
        ))}
      </ul>
      {ready.length > 5 ? <p className="mt-2 text-xs text-zinc-500">+{ready.length - 5} more ready</p> : null}
    </DashboardSection>
  );
}
