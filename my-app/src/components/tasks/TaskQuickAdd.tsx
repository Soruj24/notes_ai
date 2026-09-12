"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { useCreateTaskMutation } from "@/src/store/tasksApi";

/** One-line task creator. Enter submits; RTK invalidation refreshes lists. */
export function TaskQuickAdd({ wid }: { wid: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [createTask, { isLoading }] = useCreateTaskMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    try {
      await createTask({ wid, body: { title: trimmed } }).unwrap();
    } catch {
      setTitle(trimmed);
      toast("Could not create the task.", { tone: "danger" });
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Add a task" className="flex flex-col gap-2 sm:flex-row">
      <Input
        id="task-quick-add"
        aria-label="Task title"
        placeholder="Add a task, press Enter to save…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        className="min-w-0 flex-1"
      />
      <Button type="submit" disabled={isLoading || !title.trim()} className="shrink-0">
        <Plus size={15} aria-hidden="true" />
        {isLoading ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
