"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/src/components/ui/input";

/** Debounced search over workspace names. Remounted on external clear. */
export function WorkspaceSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (draft === value) return;
    const t = window.setTimeout(() => onChange(draft), 300);
    return () => window.clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className="relative w-full">
      <Search
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
      />
      <Input
        id="admin-workspaces-search"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search workspaces…"
        aria-label="Search workspaces by name"
        size="sm"
        className="pr-9 pl-9"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="Clear workspace search"
          className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
