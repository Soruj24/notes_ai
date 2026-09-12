"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { Dialog } from "@/src/components/ui/dialog";
import { useToast } from "@/src/components/ui/toast";
import type { TemplateDTO } from "@/src/components/templates/types";
import { payloadSummary } from "@/src/components/templates/types";

interface TemplateUseDialogProps {
  wid: string;
  open: boolean;
  onClose: () => void;
  template: TemplateDTO | null;
}

/** Confirm + anchor date, then instantiate independent copies. */
export function TemplateUseDialog({ wid, open, onClose, template }: TemplateUseDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | null>(new Date());
  const [working, setWorking] = useState(false);

  async function onUse() {
    if (!template) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/workspaces/${wid}/templates/${template.id}/use`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: date ? date.toISOString() : undefined }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        created: { notes: unknown[]; tasks: unknown[]; projects: unknown[]; goals: unknown[] };
      };
      const total =
        json.created.notes.length +
        json.created.tasks.length +
        json.created.projects.length +
        json.created.goals.length;
      onClose();
      router.refresh();
      toast(`Created ${total} independent ${total === 1 ? "item" : "items"}.`, {
        tone: "success",
      });
    } catch {
      toast("Could not use the template.", { tone: "danger" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={template ? `Use “${template.title}”` : "Use template"}
      description={
        template
          ? `Creates ${payloadSummary(template.payload)} as independent copies. The template itself never changes.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void onUse()} disabled={working || !template}>
            {working ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <DateTimePicker
        label="Anchor date ({{date}} and due offsets)"
        value={date}
        withTime={false}
        onChange={setDate}
      />
    </Dialog>
  );
}
