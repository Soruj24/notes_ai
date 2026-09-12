"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { GoalEditorDialog } from "@/src/components/goals/GoalEditorDialog";
import { MilestoneList } from "@/src/components/goals/MilestoneList";
import { ProjectCard } from "@/src/components/projects/ProjectCard";
import type { GoalDTO, ProjectDTO } from "@/src/components/projects/types";
import type { TaskDTO } from "@/src/components/tasks/types";
import { TaskList } from "@/src/components/tasks/TaskList";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { ProgressRing } from "@/src/components/ui/progress";
import { useToast } from "@/src/components/ui/toast";
import { cx } from "@/src/lib/utils/cx";

interface GoalDetailProps {
  wid: string;
  goal: GoalDTO;
  projects: ProjectDTO[];
  tasks: TaskDTO[];
}

const statusTone: Record<string, BadgeTone> = {
  active: "accent",
  achieved: "success",
  abandoned: "neutral",
};

/** Goal header (ring, source, actions) + milestones + projects + tasks. */
export function GoalDetail({ wid, goal, projects, tasks }: GoalDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const computed = goal.computedProgress;
  const [now] = useState(() => Date.now());
  const target = goal.targetDate ? new Date(goal.targetDate).getTime() : null;
  const overdue = goal.status === "active" && target !== null && target < now;
  const dueSoon =
    !overdue && goal.status === "active" && target !== null && target - now < 7 * 86400000;

  async function onDelete() {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/workspaces/${wid}/goals/${goal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.push("/goals");
      router.refresh();
    } catch {
      toast("Could not delete the goal.", { tone: "danger" });
    }
  }

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <Link
        href="/goals"
        aria-label="Back to all goals"
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Goals
      </Link>

      <section
        aria-label={`Goal ${goal.title}`}
        className={cx(
          "rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:bg-zinc-950 dark:shadow-none",
          overdue
            ? "border-red-300 dark:border-red-900/70"
            : "border-zinc-200/90 dark:border-zinc-800",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ProgressRing value={computed.percent} label={`${goal.title} progress`} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                {goal.title}
              </h1>
              {overdue ? (
                <Badge size="sm" tone="danger">Overdue</Badge>
              ) : dueSoon ? (
                <Badge size="sm" tone="warning">Due soon</Badge>
              ) : (
                <Badge size="sm" tone={statusTone[goal.status] ?? "neutral"}>{goal.status}</Badge>
              )}
              <Badge size="sm" tone="neutral">{goal.frequency}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              {goal.targetDate ? (
                <span
                  className={cx(
                    "inline-flex items-center gap-1 tabular-nums",
                    (overdue || dueSoon) && "font-semibold",
                    overdue
                      ? "text-red-600 dark:text-red-400"
                      : dueSoon
                        ? "text-amber-700 dark:text-amber-300"
                        : undefined,
                  )}
                >
                  <CalendarDays size={12} aria-hidden="true" />
                  Due {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              ) : (
                <span>No deadline</span>
              )}
              <span>
                {computed.source === "tasks"
                  ? "Computed from linked tasks"
                  : computed.source === "milestones"
                    ? "Computed from milestones"
                    : "Manual progress (no linked work yet)"}
              </span>
            </div>
            {goal.description ? (
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {goal.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 max-sm:flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden="true" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete goal ${goal.title}`}
              className="hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span className="max-sm:sr-only">Delete</span>
            </Button>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-900">
          {[
            { label: "Complete", value: `${computed.percent}%` },
            { label: "Linked projects", value: String(projects.length) },
            { label: "Direct tasks", value: String(tasks.length) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60">
              <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-label="Milestones"
        className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <MilestoneList wid={wid} goalId={goal.id} milestones={goal.milestones} />
      </section>

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2">
        <section
          aria-label="Linked projects"
          className="grid min-w-0 gap-3 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Linked projects
            </h2>
            <span className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300">
              {projects.length}
            </span>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] leading-5 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              No projects linked — set this goal on any project to track it here.
            </p>
          ) : (
            <div className="grid gap-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

        <section
          aria-label="Direct tasks"
          className="grid min-w-0 gap-3 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Direct tasks
            </h2>
            <span className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300">
              {tasks.length}
            </span>
          </div>
          <TaskList wid={wid} view="all" goalId={goal.id} hideEmpty />
          {tasks.length === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] leading-5 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              No direct tasks — link tasks to this goal from the task editor.
            </p>
          ) : null}
        </section>
      </div>

      {editing ? (
        <GoalEditorDialog
          key={goal.id}
          wid={wid}
          open={editing}
          onClose={() => setEditing(false)}
          goal={goal}
        />
      ) : null}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete goal?"
        description={`"${goal.title}" and its milestones will be deleted. Linked projects and tasks stay in place.`}
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
