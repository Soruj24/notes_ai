"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FolderKanban,
  ListTodo,
  Search,
  SearchX,
  StickyNote,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cx } from "@/src/lib/utils/cx";
import type {
  SearchEntityType,
  SearchGroup,
  SearchSource,
} from "@/src/lib/search/types";
import { SEARCH_ENTITY_TYPES } from "@/src/lib/search/types";

interface SearchExplorerProps {
  source: SearchSource;
}

const typeIcons: Record<string, LucideIcon> = {
  note: StickyNote,
  task: ListTodo,
  event: CalendarDays,
  project: FolderKanban,
  goal: Target,
};

/**
 * Full-page search reusing the exact SearchSource contract as the palette.
 * Same backend, same filters — different presentation, zero coupling.
 */
export function SearchExplorer({ source }: SearchExplorerProps) {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<SearchEntityType[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const requestRef = useRef(0);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setGroups([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(true);
    const id = ++requestRef.current;
    try {
      const result = await source.search(q, {
        types: types.length ? types : undefined,
      });
      if (requestRef.current !== id) return;
      setGroups(result.groups);
    } catch {
      if (requestRef.current === id) setGroups([]);
    } finally {
      if (requestRef.current === id) setSearching(false);
    }
  }

  function toggleType(type: SearchEntityType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  const totalHits = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          Search
        </h1>
        <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          One query across notes, tasks, projects, goals, and events.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="search-page-input"
            aria-label="Search workspace"
            placeholder="Search across notes, tasks, projects, goals, events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="lg"
            className="pr-4 pl-10"
          />
        </div>
        <Button type="submit" size="lg" disabled={searching || !query.trim()} className="shrink-0">
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Entity filters">
        <FilterChip active={types.length === 0} onClick={() => setTypes([])}>
          All
        </FilterChip>
        {SEARCH_ENTITY_TYPES.map((t) => (
          <FilterChip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
            {types.includes(t) ? <Check size={12} aria-hidden="true" /> : null}
            {t}
          </FilterChip>
        ))}
      </div>
      {searching ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Searching">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-1/2 rounded-md" />
                <Skeleton tone="text" className="mt-1.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !searched ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <Search size={22} />
          </span>
          <p className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Search your workspace
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Type above and press Enter — or hit{" "}
            <kbd className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              ⌘K
            </kbd>{" "}
            anywhere to jump straight in.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<SearchX size={20} aria-hidden="true" />}
          title="No results"
          description={`Nothing matches “${query.trim()}”. Try different words, fewer filters, or check spelling.`}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setQuery(""); setTypes([]); setGroups([]); setSearched(false); }}>
                Clear search
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5">
          <p role="status" className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
            {totalHits} {totalHits === 1 ? "result" : "results"} across {groups.length}{" "}
            {groups.length === 1 ? "type" : "types"} for “{query.trim()}”
          </p>
          {groups.map((group) => {
            const Icon = typeIcons[group.type] ?? Search;
            return (
              <section key={group.type} aria-label={group.label}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
                  >
                    <Icon size={14} />
                  </span>
                  <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {group.label}
                  </h2>
                  <span className="rounded-full bg-zinc-900/[0.06] px-1.5 py-px text-[11px] font-semibold text-zinc-500 tabular-nums dark:bg-white/[0.08] dark:text-zinc-400">
                    {group.hits.length}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {group.hits.map((hit) => (
                    <li key={hit.id}>
                      <Link
                        href={hit.href}
                        className="group flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 transition-[border-color,box-shadow,background-color] hover:border-zinc-300 hover:bg-zinc-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {hit.title}
                          </span>
                          {hit.subtitle ? (
                            <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {hit.subtitle}
                            </span>
                          ) : null}
                        </span>
                        <ArrowRight
                          size={14}
                          aria-hidden="true"
                          className="shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}
