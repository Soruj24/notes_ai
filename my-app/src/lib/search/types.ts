/**
 * Reusable search vocabulary. The palette UI depends ONLY on these types
 * plus a SearchSource — never on notes/tasks/projects/goals/events.
 */

export type SearchEntityType = "notes" | "tasks" | "projects" | "goals" | "events";

export const SEARCH_ENTITY_TYPES: SearchEntityType[] = [
  "notes",
  "tasks",
  "projects",
  "goals",
  "events",
];

export interface SearchFilters {
  types?: SearchEntityType[];
  /** ISO date bounds; matched against each entity's primary date. */
  from?: string;
  to?: string;
}

export interface SearchHit {
  id: string;
  title: string;
  subtitle?: string;
  /** ISO timestamp of the entity date used for filtering/sorting. */
  date?: string;
  href: string;
}

export interface SearchGroup {
  type: SearchEntityType;
  label: string;
  hits: SearchHit[];
}

export interface SearchResult {
  groups: SearchGroup[];
  total: number;
}

/** Data backend contract. Any domain can implement this (workspace, docs…). */
export interface SearchSource {
  search(query: string, filters: SearchFilters): Promise<SearchResult>;
}

/** Static entries shown alongside results (commands, navigation). */
export interface SearchCommand {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  run: () => void;
}

export function emptyResult(): SearchResult {
  return { groups: [], total: 0 };
}
