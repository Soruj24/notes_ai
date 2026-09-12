"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { SearchExplorer } from "@/src/components/search/SearchExplorer";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import type { SearchSource } from "@/src/lib/search/types";
import { createWorkspaceSearchSource } from "@/src/lib/search/workspace-source";

/**
 * Search page. The shell doesn't know the workspace, so the page resolves
 * it client-side once, then hands a SearchSource to the explorer.
 */
export default function SearchPage() {
  const [wid, setWid] = useState<string | null>(null);
  const [source, setSource] = useState<SearchSource | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const resolve = useCallback(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { workspaces: Array<{ id: string }> };
        if (!json.workspaces[0]) throw new Error();
        if (!cancelled) {
          setWid(json.workspaces[0].id);
          setSource(createWorkspaceSearchSource(json.workspaces[0].id));
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = resolve();
    return cleanup;
  }, [resolve, attempt]);

  if (failed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
        >
          <SearchX size={22} />
        </span>
        <h1 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Search is unavailable
        </h1>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          We could not reach your workspace. Check your connection and try again.
        </p>
        <Button
          size="sm"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="mt-5"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!wid || !source) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4" aria-busy="true" aria-label="Loading search">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-3xl">
      <SearchExplorer source={source} />
    </div>
  );
}
