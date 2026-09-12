"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Plus, Trash2, X } from "lucide-react";
import { SubtaskList } from "@/src/components/tasks/SubtaskList";
import {
  formatDue,
  isOverdue,
  type LinkOption,
  type TagDTO,
  type TaskDTO,
} from "@/src/components/tasks/types";
import { Badge, type BadgeTone } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { OptionMenu } from "@/src/components/ui/option-menu";
import { RecurrencePicker } from "@/src/components/scheduling/RecurrencePicker";
import { frequencyToValue } from "@/src/lib/recurrence/types";
import { useToast } from "@/src/components/ui/toast";
import {
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useReopenTaskMutation,
  useUpdateTaskMutation,
} from "@/src/store/tasksApi";

const AUTOSAVE_MS = 800;

const statusTone: Record<string, BadgeTone> = {
  todo: "neutral",
  in_progress: "accent",
  done: "success",
  archived: "neutral",
};

const statusLabel: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  archived: "Archived",
};

/** Visible label pairing for a custom dropdown field. */
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span id={id} className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface TaskEditorProps {
  wid: string;
  initialTask: TaskDTO;
  tags: TagDTO[];
  projects: LinkOption[];
  goals: LinkOption[];
}

/** Detail editor: debounced text, instant controls, subtasks, danger zone. */
export function TaskEditor({ wid, initialTask, tags, projects, goals }: TaskEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [task, setTask] = useState(initialTask);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [completeTask] = useCompleteTaskMutation();
  const [reopenTask] = useReopenTaskMutation();

  const done = task.status === "done";
  const overdue = isOverdue(task);

  async function save(patch: Record<string, unknown>) {
    try {
      const updated = await updateTask({ wid, id: task.id, body: patch }).unwrap();
      setTask(updated);
    } catch {
      toast("Could not save the task.", { tone: "danger" });
    }
  }

  function queueText(patch: Record<string, unknown>) {
    setTask((prev) => ({ ...prev, ...patch }) as TaskDTO);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save(patch);
    }, AUTOSAVE_MS);
  }

  function setDateTime(field: "startAt" | "dueAt", value: Date | null) {
    setTask((prev) => ({ ...prev, [field]: value ?? undefined }) as TaskDTO);
    void save({ [field]: value ? value.toISOString() : null });
  }

  async function onToggleDone() {
    try {
      if (done) {
        setTask(await reopenTask({ wid, id: task.id }).unwrap());
      } else {
        const res = await completeTask({ wid, id: task.id }).unwrap();
        setTask(res.task);
        if (res.next) toast("Next occurrence created.", { tone: "success" });
      }
    } catch {
      toast("Could not update the task.", { tone: "danger" });
    }
  }

  async function onDelete() {
    setConfirmDelete(false);
    try {
      await deleteTask({ wid, id: task.id }).unwrap();
      router.push("/tasks");
      router.refresh();
    } catch {
      toast("Could not delete the task.", { tone: "danger" });
    }
  }

  async function onAddTag() {
    const name = tagDraft.trim().toLowerCase();
    if (!name) return;
    setTagDraft("");
    try {
      let tag = tags.find((t) => t.name === name);
      if (!tag) {
        const res = await fetch(`/api/workspaces/${wid}/tags`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error();
        tag = ((await res.json()) as { tag: TagDTO }).tag;
      }
      if (!task.tags.includes(tag.id)) {
        await save({ tagIds: [...task.tags, tag.id] });
      }
      router.refresh();
    } catch {
      toast("Could not add the tag.", { tone: "danger" });
    }
  }

  const attached = task.tags
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagDTO => Boolean(t));
  const subtDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="fade-up mx-auto grid w-full max-w-3xl gap-4">
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-zinc-200/90 bg-white/90 px-2 py-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-none">
        <Link
          href="/tasks"
          aria-label="Back to all tasks"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Tasks</span>
        </Link>
        <Badge tone={statusTone[task.status] ?? "neutral"}>
          {statusLabel[task.status] ?? task.status}
        </Badge>
        <span className="ml-auto flex items-center gap-2">
          <Button size="sm" variant={done ? "secondary" : "primary"} onClick={() => void onToggleDone()}>
            {done ? "Reopen" : "Complete"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete task ${task.title}`}
            title="Delete task"
            className="h-8 w-8 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 size={15} aria-hidden="true" />
          </Button>
        </span>
      </div>

      {done ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50/70 p-4 sm:flex-row sm:items-center dark:border-emerald-400/20 dark:bg-emerald-950/40"
        >
          <p className="flex min-w-0 items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 size={15} aria-hidden="true" className="shrink-0" />
            <span className="truncate">Completed — nice work. Reopen it if there is more to do.</span>
          </p>
          <Button size="sm" variant="secondary" onClick={() => void onToggleDone()} className="shrink-0 sm:ml-auto">
            Reopen
          </Button>
        </div>
      ) : overdue ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-600/20 bg-red-50/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-950/40 dark:text-red-300"
        >
          <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
          Overdue · {formatDue(task.dueAt)}
        </p>
      ) : null}

      <article
        aria-label="Task details"
        className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-8 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <label htmlFor="task-title" className="sr-only">
          Task title
        </label>
        <input
          id="task-title"
          value={task.title}
          onChange={(e) => queueText({ title: e.target.value })}
          placeholder="Task title"
          autoComplete="off"
          className="w-full bg-transparent text-[22px] leading-8 font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:placeholder:text-zinc-400 sm:text-2xl dark:text-zinc-50 dark:placeholder:text-zinc-700"
        />
        <div aria-hidden="true" className="my-4 border-t border-zinc-100 sm:my-5 dark:border-zinc-900" />
        <label htmlFor="task-notes" className="sr-only">
          Task notes
        </label>
        <textarea
          id="task-notes"
          value={task.notes ?? ""}
          onChange={(e) => queueText({ notes: e.target.value })}
          placeholder="Add details, links, or context…"
          rows={5}
          className="min-h-28 w-full resize-y bg-transparent text-sm leading-6 text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-300 dark:placeholder:text-zinc-600"
        />
        <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-400 tabular-nums dark:border-zinc-900 dark:text-zinc-500">
          <span className={overdue ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
            {formatDue(task.dueAt)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {subtDone}/{task.subtasks.length} subtasks
          </span>
          <span aria-hidden="true">·</span>
          <span>Autosaves as you type</span>
        </footer>
      </article>

      <Section title="Schedule" description="When this task happens and how long it takes.">
        <DateTimePicker
          label="Start date"
          value={task.startAt ? new Date(task.startAt) : null}
          onChange={(value) => setDateTime("startAt", value)}
        />
        <DateTimePicker
          label="Due date"
          value={task.dueAt ? new Date(task.dueAt) : null}
          onChange={(value) => setDateTime("dueAt", value)}
        />
        <Input
          id="task-duration"
          type="number"
          min={0}
          max={10080}
          label="Duration (minutes)"
          value={task.durationMin ?? ""}
          onChange={(e) =>
            queueText({ durationMin: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
        <RecurrencePicker
          label="Repeats"
          value={frequencyToValue(task.recurrence)}
          onChange={(next) => void save({ recurrence: next.frequency })}
        />
      </Section>

      <Section title="Organization" description="Status, priority, and links to bigger work.">
        <Field id="task-status-label" label="Status">
          <OptionMenu
            label="Status"
            labelledBy="task-status-label"
            size="md"
            value={task.status}
            options={[
              { value: "todo", label: "To do" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(status) => void save({ status })}
          />
        </Field>
        <Field id="task-priority-label" label="Priority">
          <OptionMenu
            label="Priority"
            labelledBy="task-priority-label"
            size="md"
            value={task.priority}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]}
            onChange={(priority) => void save({ priority })}
          />
        </Field>
        <Field id="task-project-label" label="Project">
          <OptionMenu
            label="Project"
            labelledBy="task-project-label"
            size="md"
            value={task.projectId ?? ""}
            options={[
              { value: "", label: "No project" },
              ...projects.map((p) => ({ value: p.id, label: p.label })),
            ]}
            onChange={(projectId) => void save({ projectId: projectId || null })}
          />
        </Field>
        <Field id="task-goal-label" label="Goal">
          <OptionMenu
            label="Goal"
            labelledBy="task-goal-label"
            size="md"
            value={task.goalId ?? ""}
            options={[
              { value: "", label: "No goal" },
              ...goals.map((g) => ({ value: g.id, label: g.label })),
            ]}
            onChange={(goalId) => void save({ goalId: goalId || null })}
          />
        </Field>
      </Section>

      <section
        aria-label="Task tags"
        className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Tags</h2>
        {attached.length > 0 ? (
          <span className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Attached tags">
            {attached.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                  style={t.color ? { backgroundColor: t.color } : undefined}
                />
                #{t.name}
                <button
                  type="button"
                  onClick={() => void save({ tagIds: task.tags.filter((id) => id !== t.id) })}
                  aria-label={`Remove tag ${t.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </span>
        ) : (
          <p className="mt-2 text-[13px] text-zinc-400 dark:text-zinc-500">No tags yet — add one below.</p>
        )}
        <span className="mt-2.5 flex gap-2">
          <Input
            id="task-tag-input"
            aria-label="Add tag"
            placeholder="Add tag…"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onAddTag();
              }
            }}
            size="sm"
            className="max-w-48 flex-1 sm:flex-none"
          />
          <Button size="sm" variant="secondary" onClick={() => void onAddTag()} disabled={!tagDraft.trim()}>
            <Plus size={13} aria-hidden="true" />
            Add
          </Button>
        </span>
      </section>

      <section
        aria-label="Subtasks"
        className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <SubtaskList wid={wid} task={task} onTaskChange={setTask} />
      </section>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete task?"
        description={`"${task.title}" and its subtasks will be permanently deleted.`}
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
