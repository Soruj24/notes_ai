"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleDot, Clock, Command, Search } from "lucide-react";
import { trapTabKey } from "@/src/lib/a11y/focus-trap";
import {
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearch,
} from "@/src/lib/search/recent";
import type {
  SearchCommand,
  SearchEntityType,
  SearchFilters,
  SearchGroup,
  SearchHit,
  SearchSource,
} from "@/src/lib/search/types";
import { SEARCH_ENTITY_TYPES } from "@/src/lib/search/types";
import { cx, focusRing } from "@/src/lib/utils/cx";

const DEBOUNCE_MS = 150;

// Module-level request sequence for dropping stale responses.
// (A ref would trigger the refs-during-render rule through callbacks.)
let searchSeq = 0;

type DatePreset = "any" | "today" | "week" | "month";

function presetRange(preset: DatePreset): Pick<SearchFilters, "from" | "to"> {
  if (preset === "any") return {};
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (preset === "today") to.setHours(23, 59, 59, 999);
  else if (preset === "week") to.setDate(to.getDate() + 7);
  else to.setDate(to.getDate() + 30);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

interface FlatItem {
  key: string;
  kind: "hit" | "recent" | "command";
  label: string;
  sub?: string;
  group?: string;
  hit?: SearchHit;
  command?: SearchCommand;
}

interface SearchPaletteProps {
  wid: string;
  source: SearchSource;
  commands: SearchCommand[];
  onClose: () => void;
  onNavigate: (href: string) => void;
}

/**
 * Generic search palette. Knows SearchSource + commands only —
 * nothing about notes, tasks, or any other feature.
 * Mount-on-open keeps recent searches fresh without sync effects.
 */
export function SearchPalette({ wid, source, commands, onClose, onNavigate }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<SearchEntityType[]>([]);
  const [preset, setPreset] = useState<DatePreset>("any");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>(() => loadRecentSearches(wid));

  const runSearch = useCallback(
    async (value: string, nextTypes: SearchEntityType[], nextPreset: DatePreset) => {
      const q = value.trim();
      if (!q) return;
      setSearching(true);
      const id = ++searchSeq;
      try {
        const result = await source.search(q, {
          types: nextTypes.length ? nextTypes : undefined,
          ...presetRange(nextPreset),
        });
        if (searchSeq !== id) return;
        setGroups(result.groups);
        setActive(0);
      } catch {
        if (searchSeq !== id) return;
        setGroups([]);
      } finally {
        if (searchSeq === id) setSearching(false);
      }
    },
    [source],
  );

  // Debounced search; effect body only manages the timer (no setState).
  useEffect(() => {
    if (!query.trim()) return undefined;
    const timer = setTimeout(() => {
      void runSearch(query, types, preset);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, types, preset, runSearch]);

  const panelRef = useRef<HTMLDivElement>(null);

  // Trap Tab inside the palette (the input owns all other keys).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && panelRef.current) trapTabKey(panelRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    setActive(0);
    if (!value.trim()) {
      setGroups([]);
      setSearching(false);
    }
  }

  function toggleType(type: SearchEntityType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
    setActive(0);
  }

  function selectPreset(next: DatePreset) {
    setPreset(next);
    setActive(0);
  }

  const flat: FlatItem[] = useMemo(() => {
    if (query.trim()) {
      const out: FlatItem[] = [];
      for (const group of groups) {
        for (const hit of group.hits) {
          out.push({
            key: `${group.type}:${hit.id}`,
            kind: "hit",
            label: hit.title,
            sub: hit.subtitle,
            group: group.label,
            hit,
          });
        }
      }
      return out;
    }
    return [
      ...recents.map((recent) => ({
        key: `recent:${recent}`,
        kind: "recent" as const,
        label: recent,
        group: "Recent",
      })),
      ...commands.map((command) => ({
        key: `cmd:${command.id}`,
        kind: "command" as const,
        label: command.label,
        sub: command.hint,
        group: command.group ?? "Commands",
        command,
      })),
    ];
  }, [query, groups, recents, commands]);

  const runItem = useCallback(
    (item: FlatItem | undefined) => {
      if (!item) return;
      if (item.kind === "hit" && item.hit) {
        setRecents(saveRecentSearch(wid, query));
        onNavigate(item.hit.href);
        onClose();
      } else if (item.kind === "recent") {
        setQuery(item.label);
        setActive(0);
      } else if (item.kind === "command" && item.command) {
        item.command.run();
        onClose();
      }
    },
    [wid, query, onNavigate, onClose],
  );

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) setRecents(saveRecentSearch(wid, query));
      runItem(flat[active]);
    }
  }

  let lastGroup: string | undefined;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 dark:border-zinc-900">
          <Search size={16} aria-hidden="true" className="shrink-0 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search notes, tasks, projects, goals, events…"
            aria-label="Global search"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={flat[active] ? `sr-${flat[active].key}` : undefined}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
          {searching ? (
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" aria-label="Searching" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
          <FilterChip active={types.length === 0} onClick={() => { setTypes([]); setActive(0); }}>
            All
          </FilterChip>
          {SEARCH_ENTITY_TYPES.map((t) => (
            <FilterChip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
              {t}
            </FilterChip>
          ))}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          {(["any", "today", "week", "month"] as DatePreset[]).map((p) => (
            <FilterChip key={p} active={preset === p} onClick={() => selectPreset(p)}>
              {p === "any" ? "Any time" : p === "today" ? "Today" : p === "week" ? "7 days" : "30 days"}
            </FilterChip>
          ))}
        </div>

        <ul id="search-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
          {query.trim() && !searching && flat.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-zinc-500">
              No results for “{query.trim()}”.
            </li>
          ) : (
            flat.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : undefined;
              lastGroup = item.group;
              return (
                <li key={item.key}>
                  {header ? (
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                      {header}
                    </p>
                  ) : null}
                  <button
                    id={`sr-${item.key}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                      focusRing,
                      i === active && "bg-zinc-100 dark:bg-zinc-900",
                    )}
                  >
                    <span aria-hidden="true" className="flex shrink-0 text-zinc-400">
                      {item.kind === "recent" ? (
                        <Clock size={14} />
                      ) : item.kind === "command" ? (
                        <Command size={14} />
                      ) : (
                        <CircleDot size={14} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.sub ? (
                      <span className="shrink-0 truncate text-xs text-zinc-500">{item.sub}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-900">
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>esc close</span>
          {recents.length > 0 && !query.trim() ? (
            <button
              type="button"
              onClick={() => {
                clearRecentSearches(wid);
                setRecents([]);
              }}
              className="ml-auto hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Clear recents
            </button>
          ) : null}
        </div>
      </div>
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
        "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
        focusRing,
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
      )}
    >
      {children}
    </button>
  );
}
