"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import type { LinkOption, NoteDTO, TagDTO } from "@/src/components/notes/types";

interface NotePropertiesProps {
  note: NoteDTO;
  tags: TagDTO[];
  projects: LinkOption[];
  goals: LinkOption[];
  onPatch: (patch: Record<string, unknown>) => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
}

/** Project/goal links, tag editing, and timestamps. */
export function NoteProperties({
  note,
  tags,
  projects,
  goals,
  onPatch,
  onAddTag,
  onRemoveTag,
}: NotePropertiesProps) {
  const [draft, setDraft] = useState("");
  const attached = note.tags
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagDTO => Boolean(t));

  function submitTag() {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    onAddTag(name);
  }

  return (
    <section
      aria-label="Note details"
      className="grid gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Details
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          id="note-project"
          label="Project"
          value={note.projectId ?? ""}
          onChange={(e) => onPatch({ projectId: e.target.value || null })}
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select
          id="note-goal"
          label="Goal"
          value={note.goalId ?? ""}
          onChange={(e) => onPatch({ goalId: e.target.value || null })}
        >
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <span id="note-tags-label" className="mb-1.5 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
          Tags
        </span>
        {attached.length > 0 ? (
          <span className="flex flex-wrap gap-1.5" role="group" aria-labelledby="note-tags-label">
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
                  onClick={() => onRemoveTag(t.id)}
                  aria-label={`Remove tag ${t.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </span>
        ) : (
          <span className="block text-[13px] text-zinc-400 dark:text-zinc-500">No tags yet — add one below.</span>
        )}
        <span className="mt-2.5 flex gap-2">
          <Input
            id="note-tag-input"
            aria-label="Add tag"
            placeholder="Add tag…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitTag();
              }
            }}
            size="sm"
            className="max-w-48 flex-1 sm:flex-none"
          />
          <Button size="sm" variant="secondary" onClick={submitTag} disabled={!draft.trim()}>
            <Plus size={13} aria-hidden="true" />
            Add
          </Button>
        </span>
      </div>
      <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400 tabular-nums dark:border-zinc-900 dark:text-zinc-500">
        Updated {new Date(note.updatedAt).toLocaleString()} · Created{" "}
        {new Date(note.createdAt).toLocaleDateString()}
      </p>
    </section>
  );
}
