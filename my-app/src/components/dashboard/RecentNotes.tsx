"use client";

import Link from "next/link";
import { NotebookPen, StickyNote } from "lucide-react";
import { DashboardSection } from "@/src/components/dashboard/DashboardSection";
import { Skeleton } from "@/src/components/ui/skeleton";
import { excerpt } from "@/src/components/notes/types";
import { useListNotesQuery } from "@/src/store/notesApi";

/** Most recently updated notes with excerpts. */
export function RecentNotes({ wid }: { wid: string }) {
  const { data, isLoading, isError, refetch } = useListNotesQuery({ wid, limit: 6 });

  return (
    <DashboardSection
      title="Recent notes"
      description="Pick up where you left off"
      icon={<NotebookPen size={16} aria-hidden="true" />}
      actionHref="/notes"
      actionLabel="All notes"
    >
      {isLoading ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading recent notes">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">Could not load notes.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Retry
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300">
            <StickyNote size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No notes yet</p>
            <p className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              Capture your first thought with Quick capture.{" "}
              <Link href="/notes" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-100">
                Go to notes
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {data.slice(0, 4).map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className="block rounded-lg border border-zinc-100 p-3 transition-[border-color,background-color] hover:border-zinc-200 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800/60 dark:hover:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{note.title || "Untitled"}</p>
                <p className="mt-0.5 line-clamp-2 min-h-8 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{excerpt(note.body, 90) || "No preview available."}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
