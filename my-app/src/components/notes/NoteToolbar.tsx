"use client";

import Link from "next/link";
import { Archive, ArrowLeft, Star, Trash } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Tooltip } from "@/src/components/ui/tooltip";
import type { NoteDTO } from "@/src/components/notes/types";
import { cx } from "@/src/lib/utils/cx";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const statusCopy: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
};

const statusDot: Record<SaveStatus, string> = {
  saved: "bg-emerald-500",
  unsaved: "bg-amber-500",
  saving: "bg-indigo-500 animate-pulse",
  error: "bg-red-500",
};

interface NoteToolbarProps {
  note: NoteDTO;
  status: SaveStatus;
  onToggleFavorite: () => void;
  onToggleArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPurge: () => void;
  onRetry?: () => void;
}

/** Editor top bar: navigation, save state, and lifecycle actions. */
export function NoteToolbar({
  note,
  status,
  onToggleFavorite,
  onToggleArchive,
  onTrash,
  onRestore,
  onPurge,
  onRetry,
}: NoteToolbarProps) {
  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-zinc-200/90 bg-white/90 px-2 py-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-none">
      <Link
        href="/notes"
        aria-label="Back to all notes"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Notes</span>
      </Link>
      <span
        role="status"
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          status === "error"
            ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
            : status === "saved"
              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        )}
      >
        <span aria-hidden="true" className={cx("h-1.5 w-1.5 rounded-full", statusDot[status])} />
        {statusCopy[status]}
        {status === "error" && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            Retry
          </button>
        ) : null}
      </span>
      <span className="ml-auto flex items-center gap-0.5">
        {note.isDeleted ? (
          <>
            <Button size="sm" variant="secondary" onClick={onRestore}>
              Restore
            </Button>
            <Button size="sm" variant="destructive" onClick={onPurge}>
              Delete forever
            </Button>
          </>
        ) : (
          <>
            <Tooltip content={note.isFavorite ? "Unstar" : "Star"}>
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleFavorite}
                aria-label={note.isFavorite ? "Unstar note" : "Star note"}
                aria-pressed={note.isFavorite}
                className="h-8 w-8"
              >
                <Star
                  size={15}
                  aria-hidden="true"
                  className={note.isFavorite ? "fill-amber-400 text-amber-400" : undefined}
                />
              </Button>
            </Tooltip>
            <Tooltip content={note.isArchived ? "Unarchive" : "Archive"}>
              <Button size="icon" variant="ghost" onClick={onToggleArchive} aria-label={note.isArchived ? "Unarchive note" : "Archive note"} className="h-8 w-8">
                <Archive size={15} aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip content="Move to trash">
              <Button size="icon" variant="ghost" onClick={onTrash} aria-label="Move note to trash" className="h-8 w-8 hover:text-red-600 dark:hover:text-red-400">
                <Trash size={15} aria-hidden="true" />
              </Button>
            </Tooltip>
          </>
        )}
      </span>
    </div>
  );
}
