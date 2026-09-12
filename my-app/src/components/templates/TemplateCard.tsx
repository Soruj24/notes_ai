"use client";

import { CalendarClock, Copy, FolderKanban, LayoutTemplate, ListTodo, Pencil, Play, StickyNote, Trash2, type LucideIcon } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Tooltip } from "@/src/components/ui/tooltip";
import type { TemplateDTO } from "@/src/components/templates/types";
import { payloadSummary } from "@/src/components/templates/types";

interface TemplateCardProps {
  template: TemplateDTO;
  onPreview: () => void;
  onUse: () => void;
  onDuplicate: () => void;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
}

const kindIcons: Record<string, LucideIcon> = {
  note: StickyNote,
  task: ListTodo,
  project: FolderKanban,
  plan: CalendarClock,
};

/** Library card: summary + preview/use/duplicate/edit actions. */
export function TemplateCard({ template, onPreview, onUse, onDuplicate, onEdit, onDelete }: TemplateCardProps) {
  const builtIn = template.isPublic && !template.workspaceId;
  const Icon = kindIcons[template.kind] ?? LayoutTemplate;
  return (
    <div className="grid gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-[0_8px_20px_-8px_rgb(0_0_0/0.18)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none dark:hover:border-zinc-700 dark:hover:shadow-none">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
        >
          <Icon size={15} />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {template.title}
        </p>
        <Badge size="sm" tone={builtIn ? "accent" : "neutral"}>
          {builtIn ? "built-in" : template.kind}
        </Badge>
      </div>
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{payloadSummary(template.payload)}</p>
      <div className="flex items-center gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <Button size="sm" onClick={onUse} className="h-8">
          <Play size={13} aria-hidden="true" />
          Use
        </Button>
        <Button size="sm" variant="outline" onClick={onPreview} className="h-8">
          Preview
        </Button>
        <span className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Duplicate template">
            <Button
              size="icon"
              variant="ghost"
              onClick={onDuplicate}
              aria-label={`Duplicate ${template.title}`}
              className="h-8 w-8"
            >
              <Copy size={14} aria-hidden="true" />
            </Button>
          </Tooltip>
          {onEdit ? (
            <Tooltip content="Edit template">
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                aria-label={`Edit ${template.title}`}
                className="h-8 w-8"
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
            </Tooltip>
          ) : null}
          {onDelete ? (
            <Tooltip content="Delete template">
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                aria-label={`Delete ${template.title}`}
                className="h-8 w-8 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </Tooltip>
          ) : null}
        </span>
      </div>
    </div>
  );
}
