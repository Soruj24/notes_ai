"use client";

import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, Plus, Search, X } from "lucide-react";
import { ProjectCard } from "@/src/components/projects/ProjectCard";
import { ProjectEditorDialog } from "@/src/components/projects/ProjectEditorDialog";
import type { LinkOption, ProjectDTO } from "@/src/components/projects/types";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { cx } from "@/src/lib/utils/cx";

const filters = [
  { id: "active", label: "Active" },
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
] as const;

type FilterId = (typeof filters)[number]["id"];

const emptyCopy: Record<FilterId, { title: string; description: string }> = {
  active: {
    title: "No active projects",
    description: "Group related tasks and notes under a project with its own deadline.",
  },
  all: {
    title: "No projects yet",
    description: "Create your first project to organize tasks, notes, and deadlines.",
  },
  completed: {
    title: "Nothing completed",
    description: "Finished projects collect here for review.",
  },
  archived: {
    title: "Nothing archived",
    description: "Shelved projects rest here, out of the active workspace.",
  },
};

interface ProjectsExplorerProps {
  wid: string;
  initial: ProjectDTO[];
  goals: LinkOption[];
}

/** Filterable grid + create dialog. Server provides first paint. */
export function ProjectsExplorer({ wid, initial, goals }: ProjectsExplorerProps) {
  const [filter, setFilter] = useState<FilterId>("active");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { active: 0, all: initial.length, completed: 0, archived: 0 };
    for (const p of initial) {
      if (p.status === "active") c.active += 1;
      if (p.status === "completed") c.completed += 1;
      if (p.status === "archived") c.archived += 1;
    }
    return c;
  }, [initial]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [initial, filter, query]);

  const copy = emptyCopy[filter];
  const searching = query.trim().length > 0;

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Projects
          </h1>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Group tasks and notes under shared deadlines.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="ml-auto shrink-0">
          <Plus size={15} aria-hidden="true" />
          New project
        </Button>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <span
          className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 max-lg:w-full lg:w-auto dark:bg-zinc-900"
          role="tablist"
          aria-label="Project status filter"
        >
          {filters.map((f) => {
            const selected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f.id)}
                className={cx(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {f.label}
                <span
                  aria-label={`${counts[f.id]} ${f.label.toLowerCase()} projects`}
                  className={cx(
                    "rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums",
                    selected
                      ? "bg-zinc-900/[0.07] text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
                      : "bg-zinc-900/[0.05] text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500",
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </span>
        <div className="relative min-w-0 flex-1 lg:max-w-xs xl:ml-auto">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="projects-search"
            aria-label="Search projects"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear project search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
        {searching ? `${visible.length} of ${counts[filter]} shown` : `${visible.length} ${visible.length === 1 ? "project" : "projects"}`}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          icon={
            searching ? (
              <Search size={20} aria-hidden="true" />
            ) : filter === "active" || filter === "all" ? (
              <FolderKanban size={20} aria-hidden="true" />
            ) : (
              <LayoutGrid size={20} aria-hidden="true" />
            )
          }
          title={searching ? "No matching projects" : copy.title}
          description={
            searching
              ? `Nothing matches “${query.trim()}”. Clear the search to browse everything.`
              : copy.description
          }
          action={
            searching ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : filter === "active" || filter === "all" ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus size={15} aria-hidden="true" />
                New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      {dialogOpen ? (
        <ProjectEditorDialog
          wid={wid}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          goals={goals}
        />
      ) : null}
    </div>
  );
}
