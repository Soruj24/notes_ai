"use client";

import Link from "next/link";
import { Archive, Pin, Star, Undo2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Tooltip } from "@/src/components/ui/tooltip";
import {
  excerpt,
  formatUpdated,
  type NoteDTO,
  type NotesView,
  type TagDTO,
} from "@/src/components/notes/types";
import { cx } from "@/src/lib/utils/cx";

interface NoteListItemProps {
  note: NoteDTO;
  view: NotesView;
  tagMap: Record<string, TagDTO>;
  onToggleFavorite: (note: NoteDTO) => void;
  onArchive: (note: NoteDTO) => void;
  onRestore: (note: NoteDTO) => void;
  onPurge: (note: NoteDTO) => void;
}

/** Single note row: link + inline optimistic actions. */
export function NoteListItem({
  note,
  view,
  tagMap,
  onToggleFavorite,
  onArchive,
  onRestore,
  onPurge,
}: NoteListItemProps) {
  const tags = note.tags
    .map((id) => tagMap[id])
    .filter((t): t is TagDTO => Boolean(t))
    .slice(0, 3);
  return (
    <li
      className={cx(
        "group rounded-xl border bg-white transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)] focus-within:border-indigo-400 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:focus-within:border-indigo-400",
        note.isPinned
          ? "border-zinc-300 dark:border-zinc-700"
          : "border-zinc-200/90 dark:border-zinc-800",
      )}
    >
      <div className="flex items-start gap-1.5 p-4">
        <Link
          href={`/notes/${note.id}`}
          className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <span className="min-w-0 truncate">{note.title || "Untitled"}</span>
            {note.isPinned ? (
              <Pin size={12} aria-label="Pinned" className="shrink-0 text-zinc-400" />
            ) : null}
          </p>
          <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
            {excerpt(note.body)}
          </p>
          <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-px text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                  style={t.color ? { backgroundColor: t.color } : undefined}
                />
                {t.name}
              </span>
            ))}
            <span className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
              {formatUpdated(note.updatedAt)}
            </span>
          </span>
        </Link>
        <span className="flex shrink-0 gap-0.5">
          {view === "trash" ? (
            <>
              <Tooltip content="Restore">
                <Button size="icon" variant="ghost" onClick={() => onRestore(note)} aria-label={`Restore ${note.title || "Untitled"}`} className="h-8 w-8">
                  <Undo2 size={15} aria-hidden="true" />
                </Button>
              </Tooltip>
              <Tooltip content="Delete forever">
                <Button size="icon" variant="ghost" onClick={() => onPurge(note)} aria-label={`Delete ${note.title || "Untitled"} forever`} className="h-8 w-8 hover:text-red-600 dark:hover:text-red-400">
                  <X size={15} aria-hidden="true" />
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip content={note.isFavorite ? "Unstar" : "Star"}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onToggleFavorite(note)}
                  aria-label={`${note.isFavorite ? "Unstar" : "Star"} ${note.title || "Untitled"}`}
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
                <Button size="icon" variant="ghost" onClick={() => onArchive(note)} aria-label={`${note.isArchived ? "Unarchive" : "Archive"} ${note.title || "Untitled"}`} className="h-8 w-8">
                  <Archive size={15} aria-hidden="true" />
                </Button>
              </Tooltip>
            </>
          )}
        </span>
      </div>
    </li>
  );
}
