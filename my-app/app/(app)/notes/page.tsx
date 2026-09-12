import type { Metadata } from "next";
import { NotesPage } from "@/src/components/notes/NotesPage";
import { requireWorkspace } from "@/src/lib/workspace";
import { listTags } from "@/src/repositories/tag.repository";
import { listUserNotes } from "@/src/services/note.service";

export const metadata: Metadata = { title: "Notes" };

interface NotesHomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** All notes (excludes archived + trash). ?tag= filters by tag. */
export default async function NotesHome({ searchParams }: NotesHomeProps) {
  const { user, workspace } = await requireWorkspace("/notes");
  const params = await searchParams;
  const rawTag = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const [notes, tags] = await Promise.all([
    listUserNotes(user.id, workspace.id, { isArchived: false }),
    listTags(user.id, workspace.id),
  ]);
  const tagMap = Object.fromEntries(
    tags.map((t) => [t.id, { id: t.id, name: t.name, color: t.color }]),
  );
  return (
    <NotesPage
      workspaceId={workspace.id}
      initialNotes={notes}
      tagMap={tagMap}
      activeTag={rawTag}
      total={notes.length}
    />
  );
}
