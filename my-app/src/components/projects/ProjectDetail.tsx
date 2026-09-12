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
import { ProjectDependenciesTab } from "@/src/components/projects/ProjectDependenciesTab";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { ProgressRing } from "@/src/components/ui/progress";
import { Tabs } from "@/src/components/ui/tabs";
import { useToast } from "@/src/components/ui/toast";
import { cx } from "@/src/lib/utils/cx";
import { useListEventsQuery } from "@/src/store/scheduleApi";

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

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  {project.description || "No description."} {goalLabel ? `Goal: ${goalLabel}` : ""}
                </p>
                <div className="flex gap-2 text-xs">
                  <span>Status: {project.status}</span>
                  {project.dueAt ? <span>Due {new Date(project.dueAt).toLocaleDateString()}</span> : null}
                </div>
              </div>
            ),
          },
          {
            id: "tasks",
            label: `Tasks · ${project.progress.total}`,
            content: (
              <div className="grid gap-3">
                <TaskQuickAdd wid={wid} />
                {project.progress.total === 0 ? (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60">
                    No tasks yet — add the first one above.
                  </p>
                ) : (
                  <TaskList wid={wid} view="all" projectId={project.id} hideEmpty />
                )}
              </div>
            ),
          },
          {
            id: "notes",
            label: `Notes · ${notes.length}`,
            content: notes.length === 0 ? (
              <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60">No notes linked yet.</p>
            ) : (
              <ul className="grid gap-1.5">
                {notes.slice(0, 8).map((note) => (
                  <li key={note.id}>
                    <Link href={`/notes/${note.id}`} className="block rounded-lg border px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
                      <p className="truncate text-xs text-zinc-500">{excerpt(note.body, 80)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: "calendar",
            label: "Calendar",
            content: <ProjectCalendar wid={wid} projectId={project.id} />,
          },
          {
            id: "dependencies",
            label: "Dependencies",
            content: <ProjectDependenciesTab wid={wid} projectId={project.id} />,
          },
          {
            id: "goals",
            label: "Goals",
            content: goals.find((g) => g.id === project.goalId) ? (
              <div className="text-sm">
                Linked goal:{" "}
                <Link href={`/goals/${project.goalId}`} className="text-indigo-600 hover:underline">
                  {goals.find((g) => g.id === project.goalId)?.label}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No goal linked.</p>
            ),
          },
        ]}
        defaultValue="overview"
      />

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

function ProjectCalendar({ wid, projectId }: { wid: string; projectId: string }) {
  const { data: events, isLoading } = useListEventsQuery({ wid });
  if (isLoading) return <p className="text-sm text-zinc-500">Loading calendar…</p>;
  const filtered = (events ?? []).filter((e) => (e as unknown as { projectId?: string }).projectId === projectId);
  if (filtered.length === 0) return <p className="text-sm text-zinc-500">No events linked to this project.</p>;
  return (
    <ul className="grid gap-2">
      {filtered.slice(0, 8).map((e) => (
        <li key={e.id} className="rounded border px-3 py-2 text-sm">
          <span className="font-medium">{e.title}</span>
          <span className="ml-2 text-xs text-zinc-500">
            {new Date(e.startsAt).toLocaleDateString()} – {new Date(e.endsAt).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
