import type { Metadata } from "next";
import { NotesList } from "@/src/components/notes/NotesList";
import { requireWorkspace } from "@/src/lib/workspace";
import { listTags } from "@/src/repositories/tag.repository";
import { listUserNotes } from "@/src/services/note.service";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const { user, workspace } = await requireWorkspace("/notes/favorites");
  const [notes, tags] = await Promise.all([
    listUserNotes(user.id, workspace.id, { isFavorite: true }),
    listTags(user.id, workspace.id),
  ]);
  const tagMap = Object.fromEntries(
    tags.map((t) => [t.id, { id: t.id, name: t.name, color: t.color }]),
  );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          Favorites
        </h1>
        <span
          aria-label={`${notes.length} favorite notes`}
          className="mb-1 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
        >
          {notes.length}
        </span>
        <p className="w-full text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Starred notes — your most important ideas.
        </p>
      </div>
      <NotesList
        workspaceId={workspace.id}
        view="favorites"
        initialNotes={notes}
        tagMap={tagMap}
      />
    </div>
  );
}
