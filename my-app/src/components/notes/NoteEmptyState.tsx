import type { ReactNode } from "react";
import { Archive, Pencil, SearchX, Star, Trash } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import type { NotesView } from "@/src/components/notes/types";

const copy: Record<NotesView, { icon: ReactNode; title: string; description: string }> = {
  all: {
    icon: <Pencil size={20} aria-hidden="true" />,
    title: "No notes yet",
    description: "Capture your first thought. It autosaves as you type.",
  },
  favorites: {
    icon: <Star size={20} aria-hidden="true" />,
    title: "No favorites",
    description: "Star important notes to find them here instantly.",
  },
  archived: {
    icon: <Archive size={20} aria-hidden="true" />,
    title: "Nothing archived",
    description: "Archived notes leave your workspace but stay searchable here.",
  },
  trash: {
    icon: <Trash size={20} aria-hidden="true" />,
    title: "Trash is empty",
    description: "Deleted notes rest here until you restore or purge them.",
  },
};

interface NoteEmptyStateProps {
  view: NotesView;
  onCreate?: () => void;
  creating?: boolean;
  /** Active search text — switches copy to a no-results state. */
  query?: string;
  onClearQuery?: () => void;
}

/** Contextual empty state per notes view, with an optional create action. */
export function NoteEmptyState({ view, onCreate, creating, query, onClearQuery }: NoteEmptyStateProps) {
  if (query) {
    return (
      <EmptyState
        icon={<SearchX size={20} aria-hidden="true" />}
        title="No matching notes"
        description={`Nothing matches “${query}”. Try a different search or clear it to browse everything.`}
        action={
          onClearQuery ? (
            <Button variant="outline" onClick={onClearQuery}>
              Clear search
            </Button>
          ) : undefined
        }
      />
    );
  }
  const c = copy[view];
  return (
    <EmptyState
      icon={c.icon}
      title={c.title}
      description={c.description}
      action={
        view === "all" && onCreate ? (
          <Button onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "New note"}
          </Button>
        ) : undefined
      }
    />
  );
}
