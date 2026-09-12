"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";
import type { GoalDTO } from "@/src/components/projects/types";

interface GoalEditorDialogProps {
  wid: string;
  open: boolean;
  onClose: () => void;
  goal?: GoalDTO | null;
  onSaved?: (id: string) => void;
}

/** Shared create/edit dialog. Parent keys by goal for fresh state. */
export function GoalEditorDialog({ wid, open, onClose, goal, onSaved }: GoalEditorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [status, setStatus] = useState(goal?.status ?? "active");
  const [frequency, setFrequency] = useState(goal?.frequency ?? "monthly");
  const [targetDate, setTargetDate] = useState<Date | null>(
    goal?.targetDate ? new Date(goal.targetDate) : null,
  );
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!title.trim()) {
      toast("Title is required.", { tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        frequency,
        targetDate: targetDate ? targetDate.toISOString() : null,
      };
      const url = goal ? `/api/workspaces/${wid}/goals/${goal.id}` : `/api/workspaces/${wid}/goals`;
      const res = await fetch(url, {
        method: goal ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { goal: GoalDTO };
      onClose();
      router.refresh();
      onSaved?.(json.goal.id);
    } catch {
      toast("Could not save the goal.", { tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal ? "Edit goal" : "New goal"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Input id="goal-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title" />
        <Textarea id="goal-description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <span className="grid gap-3 sm:grid-cols-3">
          <Select id="goal-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="abandoned">Abandoned</option>
          </Select>
          <Select id="goal-frequency" label="Cadence" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <DateTimePicker
            label="Deadline"
            value={targetDate}
            withTime={false}
            onChange={setTargetDate}
            placeholder="No deadline"
          />
        </span>
      </div>
    </Dialog>
  );
}
