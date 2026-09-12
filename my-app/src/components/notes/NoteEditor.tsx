"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2 } from "lucide-react";
import { AINotePreview } from "@/src/components/notes/AINotePreview";
import { NoteAIActions } from "@/src/components/notes/NoteAIActions";
import type { NoteAIAction, NoteAIResult, NoteSuggestion } from "@/src/lib/ai/note-intelligence";
import { NoteProperties } from "@/src/components/notes/NoteProperties";
import { NoteToolbar, type SaveStatus } from "@/src/components/notes/NoteToolbar";
import { formatUpdated } from "@/src/components/notes/types";
import type { LinkOption, NoteDTO, TagDTO } from "@/src/components/notes/types";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { useToast } from "@/src/components/ui/toast";

const AUTOSAVE_MS = 800;

interface NoteEditorProps {
  workspaceId: string;
  initialNote: NoteDTO;
  tags: TagDTO[];
  projects: LinkOption[];
  goals: LinkOption[];
}

/**
 * Autosaving editor. Text edits debounce into PATCH; flag/tag actions
 * save immediately. Unmount flushes leftovers via POST (same update path).
 */
export function NoteEditor({ workspaceId, initialNote, tags, projects, goals }: NoteEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = useState(initialNote);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [aiRunning, setAiRunning] = useState<NoteAIAction | null>(null);
  const [aiResult, setAiResult] = useState<NoteAIResult | null>(null);
  const [aiApplied, setAiApplied] = useState<Set<string>>(new Set());
  const pendingRef = useRef<Record<string, unknown>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef(note);
  useEffect(() => {
    noteRef.current = note;
  });

  const baseUrl = `/api/workspaces/${workspaceId}/notes/${initialNote.id}`;

  const flush = useCallback(async () => {
    const patch = pendingRef.current;
    if (Object.keys(patch).length === 0) return;
    pendingRef.current = {};
    setStatus("saving");
    try {
      const res = await fetch(baseUrl, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { note: NoteDTO };
      setNote(json.note);
      setStatus("saved");
    } catch {
      pendingRef.current = { ...patch, ...pendingRef.current };
      setStatus("error");
    }
  }, [baseUrl]);

  const queuePatch = useCallback(
    (patch: Record<string, unknown>) => {
      setNote((prev) => ({ ...prev, ...patch }));
      pendingRef.current = { ...pendingRef.current, ...patch };
      setStatus("unsaved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_MS);
    },
    [flush],
  );

  // Flush leftovers on unmount (navigation mid-typing).
  useEffect(() => {
    const pending = pendingRef;
    const url = baseUrl;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (Object.keys(pending.current).length > 0 && navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob([JSON.stringify(pending.current)], { type: "application/json" }),
        );
      }
    };
  }, [baseUrl]);

  async function saveNow(patch: Record<string, unknown>) {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = { ...pendingRef.current, ...patch };
    await flush();
  }

  async function onAddTag(name: string) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { tag: TagDTO };
      if (!noteRef.current.tags.includes(json.tag.id)) {
        await saveNow({ tagIds: [...noteRef.current.tags, json.tag.id] });
      }
      router.refresh();
    } catch {
      toast("Could not add the tag.", { tone: "danger" });
    }
  }

  async function onRemoveTag(tagId: string) {
    await saveNow({ tagIds: noteRef.current.tags.filter((t) => t !== tagId) });
  }

  function aiKey(s: NoteSuggestion): string {
    return `${s.kind}:${s.label}`;
  }

  function markApplied(s: NoteSuggestion) {
    setAiApplied((prev) => new Set(prev).add(aiKey(s)));
  }

  async function runAiAction(action: NoteAIAction, question?: string) {
    setAiRunning(action);
    setAiResult(null);
    try {
      const res = await fetch(`${baseUrl}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, question }),
      });
      const json = (await res.json()) as NoteAIResult & {
        errors?: Record<string, string[]>;
        error?: string;
      };
      if (!res.ok) {
        toast(
          json.error ?? json.errors?.form?.join(" ") ?? "The AI run failed.",
          { tone: "danger" },
        );
        return;
      }
      setAiResult(json);
      setAiApplied(new Set());
    } catch {
      toast("Network error. Please try again.", { tone: "danger" });
    } finally {
      setAiRunning(null);
    }
  }

  async function applyAiTask(s: NoteSuggestion) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: s.label,
          dueAt: (s.payload.dueAt as string | undefined) ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      markApplied(s);
      toast("Task created.", { tone: "success" });
    } catch {
      toast("Could not create the task.", { tone: "danger" });
    }
  }

  async function applyAiReminder(s: NoteSuggestion) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/reminders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: s.label,
          remindAt: s.payload.remindAt as string,
        }),
      });
      if (!res.ok) throw new Error();
      markApplied(s);
      toast("Reminder created.", { tone: "success" });
    } catch {
      toast("Could not create the reminder.", { tone: "danger" });
    }
  }

  async function applyAiTag(s: NoteSuggestion) {
    await onAddTag(s.label);
    markApplied(s);
  }

  async function applyAiTitle(s: NoteSuggestion) {
    await saveNow({ title: s.label });
    markApplied(s);
  }

  async function applyAiBody(text: string) {
    await saveNow({ body: text });
    toast("Note content replaced.", { tone: "success" });
  }

  async function onTrash() {
    const res = await fetch(baseUrl, { method: "DELETE" });
    if (!res.ok) {
      toast("Could not trash the note.", { tone: "danger" });
      return;
    }
    router.push("/notes");
    router.refresh();
  }

  async function onRestore() {
    const res = await fetch(`${baseUrl}/restore`, { method: "POST" });
    if (!res.ok) {
      toast("Could not restore the note.", { tone: "danger" });
      return;
    }
    const json = (await res.json()) as { note: NoteDTO };
    setNote(json.note);
  }

  async function onPurge() {
    setConfirmPurge(false);
    const res = await fetch(`${baseUrl}/purge`, { method: "DELETE" });
    if (!res.ok) {
      toast("Could not delete the note.", { tone: "danger" });
      return;
    }
    router.push("/notes/trash");
    router.refresh();
  }

  const words = note.body ? note.body.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="fade-up mx-auto grid w-full max-w-3xl gap-4">
      <NoteToolbar
        note={note}
        status={status}
        onToggleFavorite={() => void saveNow({ isFavorite: !noteRef.current.isFavorite })}
        onToggleArchive={() => void saveNow({ isArchived: !noteRef.current.isArchived })}
        onTrash={() => void onTrash()}
        onRestore={() => void onRestore()}
        onPurge={() => setConfirmPurge(true)}
        onRetry={() => void flush()}
      />
      {note.isDeleted ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-amber-600/25 bg-amber-50/70 p-4 sm:flex-row sm:items-center dark:border-amber-400/20 dark:bg-amber-950/40"
        >
          <p className="flex min-w-0 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <Trash2 size={15} aria-hidden="true" className="shrink-0" />
            <span className="truncate">This note is in trash — editing is disabled.</span>
          </p>
          <Button size="sm" variant="secondary" onClick={() => void onRestore()} className="shrink-0 sm:ml-auto">
            Restore
          </Button>
        </div>
      ) : note.isArchived ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50 p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <p className="flex min-w-0 items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Archive size={15} aria-hidden="true" className="shrink-0" />
            <span className="truncate">Archived — hidden from the workspace until restored.</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void saveNow({ isArchived: false })}
            className="shrink-0 sm:ml-auto"
          >
            Unarchive
          </Button>
        </div>
      ) : null}
      <article
        aria-label="Note document"
        className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-8 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <label htmlFor="note-title" className="sr-only">
          Note title
        </label>
        <input
          id="note-title"
          value={note.title}
          onChange={(e) => queuePatch({ title: e.target.value })}
          placeholder="Untitled"
          disabled={note.isDeleted}
          autoComplete="off"
          className="w-full bg-transparent text-[26px] leading-9 font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:placeholder:text-zinc-400 sm:text-3xl sm:leading-10 dark:text-zinc-50 dark:placeholder:text-zinc-700"
        />
        <div aria-hidden="true" className="my-4 border-t border-zinc-100 sm:my-5 dark:border-zinc-900" />
        <label htmlFor="note-body" className="sr-only">
          Note body
        </label>
        <textarea
          id="note-body"
          value={note.body ?? ""}
          onChange={(e) => queuePatch({ body: e.target.value })}
          placeholder="Start writing…"
          disabled={note.isDeleted}
          rows={16}
          className="min-h-[40vh] w-full resize-y bg-transparent text-[15px] leading-7 text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
        />
        <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-400 tabular-nums dark:border-zinc-900 dark:text-zinc-500">
          <span>
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span aria-hidden="true">·</span>
          <span>Edited {formatUpdated(note.updatedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>Autosaves as you type</span>
        </footer>
      </article>
      <NoteProperties
        note={note}
        tags={tags}
        projects={projects}
        goals={goals}
        onPatch={queuePatch}
        onAddTag={(name) => void onAddTag(name)}
        onRemoveTag={(tagId) => void onRemoveTag(tagId)}
      />
      <NoteAIActions running={aiRunning} onRun={(action, question) => void runAiAction(action, question)} />
      {aiResult ? (
        <AINotePreview
          result={aiResult}
          appliedKeys={aiApplied}
          onApplyTask={(s) => void applyAiTask(s)}
          onApplyReminder={(s) => void applyAiReminder(s)}
          onApplyTag={(s) => void applyAiTag(s)}
          onApplyTitle={(s) => void applyAiTitle(s)}
          onReplaceBody={(text) => void applyAiBody(text)}
          onDismiss={() => setAiResult(null)}
        />
      ) : null}
      <Dialog
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        title="Delete forever?"
        description={`"${note.title || "Untitled"}" will be permanently deleted. This cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmPurge(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onPurge()}>
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
