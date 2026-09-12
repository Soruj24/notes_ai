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
import type { LinkOption, ProjectDTO } from "@/src/components/projects/types";

interface ProjectEditorDialogProps {
  wid: string;
  open: boolean;
  onClose: () => void;
  project?: ProjectDTO | null;
  goals: LinkOption[];
  onSaved?: (id: string) => void;
}

/** Shared create/edit dialog. Parent keys by project for fresh state. */
export function ProjectEditorDialog({ wid, open, onClose, project, goals, onSaved }: ProjectEditorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  const [color, setColor] = useState(project?.color ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    project?.dueAt ? new Date(project.dueAt) : null,
  );
  const [goalId, setGoalId] = useState(project?.goalId ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) {
      toast("Name is required.", { tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        color: color.trim() || undefined,
        dueAt: dueDate ? dueDate.toISOString() : null,
        goalId: goalId || null,
      };
      const url = project
        ? `/api/workspaces/${wid}/projects/${project.id}`
        : `/api/workspaces/${wid}/projects`;
      const res = await fetch(url, {
        method: project ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { project: ProjectDTO };
      onClose();
      router.refresh();
      onSaved?.(json.project.id);
    } catch {
      toast("Could not save the project.", { tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
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
        <Input id="project-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
        <Textarea id="project-description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <span className="grid gap-3 sm:grid-cols-2">
          <Select id="project-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
          <Select id="project-goal" label="Goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </Select>
        </span>
        <span className="grid gap-3 sm:grid-cols-2">
          <DateTimePicker
            label="Deadline"
            value={dueDate}
            withTime={false}
            onChange={setDueDate}
            placeholder="No deadline"
          />
          <Input id="project-color" label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6366f1" />
        </span>
      </div>
    </Dialog>
  );
}
