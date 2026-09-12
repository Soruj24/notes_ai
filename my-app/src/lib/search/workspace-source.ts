import type {
  SearchFilters,
  SearchResult,
  SearchSource,
} from "@/src/lib/search/types";

/** SearchSource hitting the workspace search API. Feature-agnostic. */
export function createWorkspaceSearchSource(wid: string): SearchSource {
  return {
    async search(query: string, filters: SearchFilters): Promise<SearchResult> {
      const params = new URLSearchParams({ q: query });
      if (filters.types?.length) params.set("types", filters.types.join(","));
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`/api/workspaces/${wid}/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed.");
      return (await res.json()) as SearchResult;
    },
  };
}
