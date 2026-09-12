"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArrowLeft, CalendarDays, Pencil, Target, Trash2 } from "lucide-react";
import { ProjectEditorDialog } from "@/src/components/projects/ProjectEditorDialog";
import { isOverdueDue, type LinkOption, type ProjectDTO } from "@/src/components/projects/types";
import { excerpt, type NoteDTO } from "@/src/components/notes/types";
import { TaskList } from "@/src/components/tasks/TaskList";
import { TaskQuickAdd } from "@/src/components/tasks/TaskQuickAdd";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { ProgressRing } from "@/src/components/ui/progress";
import { useToast } from "@/src/components/ui/toast";
import { cx } from "@/src/lib/utils/cx";

interface ProjectDetailProps {
  wid: string;
  project: ProjectDTO;
  notes: NoteDTO[];
  goals: LinkOption[];
}

const statusTone: Record<string, BadgeTone> = {
  active: "accent",
  on_hold: "warning",
  completed: "success",
  archived: "neutral",
};

/** Header (ring, meta, actions) + tasks + linked notes. */
export function ProjectDetail({ wid, project, notes, goals }: ProjectDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overdue = project.status === "active" && isOverdueDue(project.dueAt);
  const goalLabel = goals.find((g) => g.id === project.goalId)?.label;
  const archived = project.status === "archived";

  async function onArchive() {
    const next = archived ? "active" : "archived";
    try {
      const res = await fetch(`/api/workspaces/${wid}/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast("Could not update the project.", { tone: "danger" });
    }
  }

  async function onDelete() {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/workspaces/${wid}/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.push("/projects");
      router.refresh();
    } catch {
      toast("Could not delete the project.", { tone: "danger" });
    }
  }

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <Link
        href="/projects"
        aria-label="Back to all projects"
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Projects
      </Link>

      <section
        aria-label={`Project ${project.name}`}
        className={cx(
          "rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:bg-zinc-950 dark:shadow-none",
          overdue
            ? "border-red-300 dark:border-red-900/70"
            : "border-zinc-200/90 dark:border-zinc-800",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white max-sm:hidden"
            style={{ backgroundColor: project.color || "#52525b" }}
          >
            {project.name.charAt(0).toUpperCase() || "P"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                {project.name}
              </h1>
              <Badge size="sm" tone={overdue ? "danger" : (statusTone[project.status] ?? "neutral")}>
                {overdue ? "Overdue" : project.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              {goalLabel ? (
                <Link
                  href={`/goals/${project.goalId}`}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  <Target size={12} aria-hidden="true" /> {goalLabel}
                </Link>
              ) : null}
              {project.dueAt ? (
                <span
                  className={cx(
                    "inline-flex items-center gap-1 tabular-nums",
                    overdue && "font-semibold text-red-600 dark:text-red-400",
                  )}
                >
                  <CalendarDays size={12} aria-hidden="true" />
                  Due {new Date(project.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              ) : (
                <span>No deadline</span>
              )}
            </div>
            {project.description ? (
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 max-sm:flex-wrap sm:flex-col sm:items-end lg:flex-row">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden="true" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => void onArchive()}>
              <Archive size={13} aria-hidden="true" />
              {archived ? "Unarchive" : "Archive"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete project ${project.name}`}
              className="hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span className="max-sm:sr-only">Delete</span>
            </Button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center dark:border-zinc-900">
          <ProgressRing value={project.progress.percent} label={`${project.name} progress`} size={64} />
          <dl className="grid flex-1 grid-cols-3 gap-2">
            {[
              { label: "Complete", value: `${project.progress.percent}%` },
              { label: "Tasks done", value: `${project.progress.done}/${project.progress.total}` },
              { label: "Linked notes", value: String(notes.length) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60"
              >
                <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {s.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <section
          aria-label="Project tasks"
          className="grid min-w-0 gap-3 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Tasks</h2>
            <span className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300">
              {project.progress.total}
            </span>
          </div>
          <TaskQuickAdd wid={wid} />
          {project.progress.total === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              No tasks yet — add the first one above to start tracking progress.
            </p>
          ) : (
            <TaskList wid={wid} view="all" projectId={project.id} hideEmpty />
          )}
        </section>

        <section
          aria-label="Project notes"
          className="grid min-w-0 gap-3 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Notes</h2>
            <span className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300">
              {notes.length}
            </span>
          </div>
          {notes.length === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] leading-5 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              No notes linked yet — set this project on any note to collect research here.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {notes.slice(0, 8).map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className="block rounded-lg border border-zinc-200/80 px-3 py-2 transition-[border-color,background-color] hover:border-zinc-300 hover:bg-zinc-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
                  >
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{note.title || "Untitled"}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{excerpt(note.body, 80)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing ? (
        <ProjectEditorDialog
          key={project.id}
          wid={wid}
          open={editing}
          onClose={() => setEditing(false)}
          project={project}
          goals={goals}
        />
      ) : null}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete project?"
        description={`"${project.name}" will be deleted. Its tasks and notes stay in place, unlinked.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void onDelete()}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">This cannot be undone.</p>
      </Dialog>
    </div>
  );
}
