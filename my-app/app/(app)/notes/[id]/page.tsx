import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/src/components/notes/NoteEditor";
import { requireWorkspace } from "@/src/lib/workspace";
import { listTags } from "@/src/repositories/tag.repository";
import { getUserNote } from "@/src/services/note.service";
import { listUserProjects } from "@/src/services/project.service";
import { listUserGoals } from "@/src/services/goal.service";

export const metadata: Metadata = { title: "Note" };

interface NoteDetailProps {
  params: Promise<{ id: string }>;
}

/** Note detail + editor. Data loads on the server; editing is client-side. */
export default async function NoteDetailPage({ params }: NoteDetailProps) {
  const { id } = await params;
  const { user, workspace } = await requireWorkspace(`/notes/${id}`);
  let note;
  try {
    note = await getUserNote(user.id, workspace.id, id);
  } catch {
    notFound();
  }
  const [tags, projects, goals] = await Promise.all([
    listTags(user.id, workspace.id),
    listUserProjects(user.id, workspace.id),
    listUserGoals(user.id, workspace.id),
  ]);
  return (
    <NoteEditor
      workspaceId={workspace.id}
      initialNote={note}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      projects={projects.map((p) => ({ id: p.id, label: p.name }))}
      goals={goals.map((g) => ({ id: g.id, label: g.title }))}
    />
  );
}
