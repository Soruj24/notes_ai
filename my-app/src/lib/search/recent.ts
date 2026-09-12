/** Recent-searches store (localStorage, per workspace). Framework-free. */

const MAX_RECENT = 8;

function key(workspaceId: string): string {
  return `notoai:recent-search:${workspaceId}`;
}

export function loadRecentSearches(workspaceId: string): string[] {
  try {
    const raw = window.localStorage.getItem(key(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(workspaceId: string, query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches(workspaceId);
  const next = [trimmed, ...loadRecentSearches(workspaceId).filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENT,
  );
  try {
    window.localStorage.setItem(key(workspaceId), JSON.stringify(next));
  } catch {
    // Private mode: recents simply don't persist.
  }
  return next;
}

export function clearRecentSearches(workspaceId: string): void {
  try {
    window.localStorage.removeItem(key(workspaceId));
  } catch {
    // Ignore.
  }
}
