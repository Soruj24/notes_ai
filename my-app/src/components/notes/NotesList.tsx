"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { NoteEmptyState } from "@/src/components/notes/NoteEmptyState";
import { NoteListItem } from "@/src/components/notes/NoteListItem";
import type {
  NoteDTO,
  NotesView,
  TagDTO,
} from "@/src/components/notes/types";
import { Dialog } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";

interface NotesListProps {
  workspaceId: string;
  view: NotesView;
  initialNotes: NoteDTO[];
  tagMap: Record<string, TagDTO>;
  activeTag?: string;
}

/**
 * Filterable list with optimistic favorite/archive toggles.
 * Server pages provide the first paint; mutations PATCH the API.
 */
export function NotesList({ workspaceId, view, initialNotes, tagMap, activeTag }: NotesListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<NoteDTO | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.body ?? "").toLowerCase().includes(q)
      );
    });
  }, [notes, query, activeTag]);

  async function patchNote(note: NoteDTO, patch: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/workspaces/${workspaceId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  }

  /** Optimistic toggle with rollback on failure. */
  async function optimistic(note: NoteDTO, patch: Record<string, unknown>) {
    const previous = notes;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, ...patch } : n)),
    );
    if (!(await patchNote(note, patch))) {
      setNotes(previous);
      toast("Could not update the note.", { tone: "danger" });
    }
  }

  async function onCreate() {
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Untitled note" }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { note: NoteDTO };
      router.push(`/notes/${json.note.id}`);
    } catch {
      toast("Could not create the note.", { tone: "danger" });
    } finally {
      setCreating(false);
    }
  }

  async function onRestore(note: NoteDTO) {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/notes/${note.id}/restore`,
      { method: "POST" },
    );
    if (!res.ok) {
      toast("Could not restore the note.", { tone: "danger" });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    toast("Note restored.", { tone: "success" });
  }

  async function onPurgeConfirmed() {
    const note = purgeTarget;
    if (!note) return;
    setPurgeTarget(null);
    const res = await fetch(
      `/api/workspaces/${workspaceId}/notes/${note.id}/purge`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast("Could not delete the note.", { tone: "danger" });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  const activeTagName = activeTag ? tagMap[activeTag]?.name : undefined;
  const filtering = query.trim().length > 0 || Boolean(activeTag);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="notes-search"
            aria-label="Search notes"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {view === "all" ? (
          <Button onClick={onCreate} disabled={creating} className="shrink-0 sm:ml-auto">
            <Plus size={15} aria-hidden="true" />
            {creating ? "Creating…" : "New note"}
          </Button>
        ) : null}
      </div>
      <div className="flex min-h-5 flex-wrap items-center gap-2" aria-live="polite">
        {activeTagName ? (
          <Link
            href="/notes"
            aria-label={`Clear tag filter ${activeTagName}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-600/20 bg-indigo-50 py-0.5 pr-1.5 pl-2.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/25 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            #{activeTagName}
            <X size={12} aria-hidden="true" />
          </Link>
        ) : null}
        <span className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
          {filtering
            ? `${visible.length} of ${notes.length} shown`
            : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        </span>
      </div>
      {visible.length === 0 ? (
        <NoteEmptyState
          view={view}
          onCreate={view === "all" && !filtering ? onCreate : undefined}
          creating={creating}
          query={filtering ? query.trim() : undefined}
          onClearQuery={filtering ? () => setQuery("") : undefined}
        />
      ) : (
        <ul className="grid items-start gap-2.5 xl:grid-cols-2">
          {visible.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              view={view}
              tagMap={tagMap}
              onToggleFavorite={(n) => optimistic(n, { isFavorite: !n.isFavorite })}
              onArchive={(n) => optimistic(n, { isArchived: !n.isArchived })}
              onRestore={onRestore}
              onPurge={setPurgeTarget}
            />
          ))}
        </ul>
      )}
      <Dialog
        open={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        title="Delete forever?"
        description={`"${purgeTarget?.title || "Untitled"}" will be permanently deleted. This cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onPurgeConfirmed}>
              Delete forever
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">
          Restore it instead if you might need it later.
        </p>
      </Dialog>
    </div>
  );
}
