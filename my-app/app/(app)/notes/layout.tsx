import { NotesSidebar } from "@/src/components/notes/NotesSidebar";
import { NotesViewTabs } from "@/src/components/notes/NotesViewTabs";
import { requireWorkspace } from "@/src/lib/workspace";
import { listTags } from "@/src/repositories/tag.repository";
import { countUserNotes } from "@/src/services/note.service";

/** Notes section layout: persistent sidebar + content. */
export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await requireWorkspace("/notes");
  const [counts, tags] = await Promise.all([
    countUserNotes(user.id, workspace.id),
    listTags(user.id, workspace.id),
  ]);
  return (
    <div className="flex items-start gap-5 lg:gap-8">
      <div className="hidden shrink-0 md:block">
        <NotesSidebar
          counts={counts}
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
          active="/notes"
        />
      </div>
      <div className="grid min-w-0 flex-1 gap-4">
        <NotesViewTabs />
        {children}
      </div>
    </div>
  );
}
