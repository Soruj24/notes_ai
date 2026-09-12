"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/components/ui/toast";
import type { TemplateDTO } from "@/src/components/templates/types";

interface TemplateEditorDialogProps {
  wid: string;
  open: boolean;
  onClose: () => void;
  template?: TemplateDTO | null;
}

/**
 * Create/edit dialog. Payload edits as structured note/task line lists
 * (titles only) to keep custom templates approachable.
 */
export function TemplateEditorDialog({ wid, open, onClose, template }: TemplateEditorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const payload = (template?.payload ?? {}) as Record<string, unknown>;
  const [title, setTitle] = useState(template?.title ?? "");
  const [kind, setKind] = useState(template?.kind ?? "note");
  const [notesText, setNotesText] = useState(
    Array.isArray(payload.notes)
      ? payload.notes
          .map((n) => (typeof n === "object" && n !== null ? String((n as Record<string, unknown>).title ?? "") : ""))
          .join("\n")
      : "",
  );
  const [tasksText, setTasksText] = useState(
    Array.isArray(payload.tasks)
      ? payload.tasks
          .map((t) => (typeof t === "object" && t !== null ? String((t as Record<string, unknown>).title ?? "") : ""))
          .join("\n")
      : "",
  );
  const [saving, setSaving] = useState(false);

  function buildPayload(): Record<string, unknown> {
    const notes = notesText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ title: t.slice(0, 200) }));
    const tasks = tasksText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ title: t.slice(0, 200) }));
    const next: Record<string, unknown> = {};
    if (notes.length) next.notes = notes;
    if (tasks.length) next.tasks = tasks;
    return next;
  }

  async function onSave() {
    if (!title.trim()) {
      toast("Title is required.", { tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      const body = { kind, title: title.trim(), payload: buildPayload() };
      const url = template
        ? `/api/workspaces/${wid}/templates/${template.id}`
        : `/api/workspaces/${wid}/templates`;
      const res = await fetch(url, {
        method: template ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onClose();
      router.refresh();
    } catch {
      toast("Could not save the template.", { tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={template ? "Edit template" : "New template"}
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
        <Input id="template-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select id="template-kind" label="Kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="note">Note</option>
          <option value="task">Task</option>
          <option value="project">Project</option>
          <option value="plan">Plan</option>
        </Select>
        <Textarea
          id="template-notes"
          label="Notes (one title per line)"
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          rows={3}
        />
        <Textarea
          id="template-tasks"
          label="Tasks (one title per line)"
          value={tasksText}
          onChange={(e) => setTasksText(e.target.value)}
          rows={3}
        />
      </div>
    </Dialog>
  );
}
