import { NotesList } from "@/src/components/notes/NotesList";
import type { NoteDTO, TagDTO } from "@/src/components/notes/types";

interface NotesPageProps {
  workspaceId: string;
  initialNotes: NoteDTO[];
  tagMap: Record<string, TagDTO>;
  activeTag?: string;
  total: number;
}

const VIEW_COPY: Record<string, { title: string; description: string }> = {
  all: { title: "Notes", description: "Capture, organize, and find every thought." },
  favorites: { title: "Favorites", description: "Starred notes — your most important ideas." },
  archived: { title: "Archived", description: "Out of the workspace, still searchable here." },
  trash: { title: "Trash", description: "Deleted notes rest here until you restore or purge them." },
};

/** "All notes" view: header + filterable list. */
export function NotesPage({ workspaceId, initialNotes, tagMap, activeTag, total }: NotesPageProps) {
  const copy = VIEW_COPY.all;
  const activeTagName = activeTag ? tagMap[activeTag]?.name : undefined;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          {copy.title}
        </h1>
        <span
          aria-label={`${total} notes`}
          className="mb-1 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
        >
          {total}
        </span>
        {activeTagName ? (
          <span className="mb-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            tagged <span className="font-semibold text-zinc-900 dark:text-zinc-100">#{activeTagName}</span>
          </span>
        ) : (
          <p className="w-full text-sm leading-6 text-zinc-500 dark:text-zinc-400">{copy.description}</p>
        )}
      </div>
      <NotesList
        workspaceId={workspaceId}
        view="all"
        initialNotes={initialNotes}
        tagMap={tagMap}
        activeTag={activeTag}
      />
    </div>
  );
}
