/** Shared DTOs for the notes UI (server records and API JSON both fit). */

export interface NoteDTO {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  body?: string;
  tags: string[];
  projectId?: string;
  goalId?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TagDTO {
  id: string;
  name: string;
  color?: string;
}

export interface LinkOption {
  id: string;
  label: string;
}

export type NotesView = "all" | "favorites" | "archived" | "trash";

export function viewFilters(view: NotesView): {
  favorite?: string;
  archived?: string;
  trash?: string;
} {
  if (view === "favorites") return { favorite: "1" };
  if (view === "archived") return { archived: "1" };
  if (view === "trash") return { trash: "1" };
  return { archived: "0" };
}

export function formatUpdated(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function excerpt(body: string | undefined, length = 120): string {
  if (!body) return "No content yet.";
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
