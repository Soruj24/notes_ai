"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { useAppDispatch } from "@/src/store/hooks";
import { dashboardApi } from "@/src/store/dashboardApi";
import { notesApi } from "@/src/store/notesApi";
import { scheduleApi } from "@/src/store/scheduleApi";
import { tasksApi } from "@/src/store/tasksApi";
import { useCreateNoteMutation } from "@/src/store/notesApi";
import { useCreateEventMutation } from "@/src/store/scheduleApi";
import { useCreateTaskMutation } from "@/src/store/tasksApi";
import { cx } from "@/src/lib/utils/cx";

type CaptureKind = "note" | "task" | "event";

const tabs: Array<{ id: CaptureKind; label: string; hint: string }> = [
  { id: "task", label: "Task", hint: "Add a task for today…" },
  { id: "note", label: "Note", hint: "Capture a thought…" },
  { id: "event", label: "Event", hint: "Name an event for the next hour…" },
];

/** One-line capture for notes, tasks, and events with cache refresh. */
export function QuickCapture({ wid }: { wid: string }) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [kind, setKind] = useState<CaptureKind>("task");
  const [text, setText] = useState("");
  const [createNote, { isLoading: savingNote }] = useCreateNoteMutation();
  const [createTask, { isLoading: savingTask }] = useCreateTaskMutation();
  const [createEvent, { isLoading: savingEvent }] = useCreateEventMutation();
  const saving = savingNote || savingTask || savingEvent;

  function refresh() {
    dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
    dispatch(notesApi.util.invalidateTags(["NoteLists"]));
    dispatch(tasksApi.util.invalidateTags(["TaskLists", "TaskCounts"]));
    dispatch(scheduleApi.util.invalidateTags(["Schedule", "EventLists"]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    setText("");
    try {
      if (kind === "note") {
        await createNote({ wid, body: { title } }).unwrap();
      } else if (kind === "task") {
        await createTask({ wid, body: { title } }).unwrap();
      } else {
        const start = new Date();
        start.setHours(start.getHours() + 1, 0, 0, 0);
        await createEvent({
          wid,
          body: {
            title,
            startsAt: start.toISOString(),
            endsAt: new Date(start.getTime() + 3600000).toISOString(),
          },
        }).unwrap();
      }
      refresh();
      toast(`Captured — find it under ${kind}s.`, { tone: "success" });
    } catch {
      setText(title);
      toast("Could not capture.", { tone: "danger" });
    }
  }

  const active = tabs.find((t) => t.id === kind) ?? tabs[0];

  return (
    <DashboardSection
      title="Quick capture"
      description="Jot it down now, organize later."
      icon={<Zap size={16} aria-hidden="true" />}
    >
      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        role="tablist"
        aria-label="Capture type"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={kind === t.id}
            onClick={() => setKind(t.id)}
            className={cx(
              "h-8 rounded-lg text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
              kind === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <Input
          id="quick-capture"
          aria-label={`Quick capture ${active.label}`}
          placeholder={active.hint}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={saving}
          className="flex-1"
        />
        <Button type="submit" disabled={saving || !text.trim()} className="shrink-0">
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
      <p className="mt-2.5 text-xs leading-5 text-zinc-400 dark:text-zinc-500">
        Tip: tasks land in{" "}
        <Link href="/tasks/today" className="font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
          Today
        </Link>
        . Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-900">↵</kbd> to save.
      </p>
    </DashboardSection>
  );
}
