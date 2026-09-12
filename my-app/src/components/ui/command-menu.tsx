"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trapTabKey } from "@/src/lib/a11y/focus-trap";
import { cx, focusRing } from "@/src/lib/utils/cx";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  keywords?: string;
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  onSelect: (id: string) => void;
  placeholder?: string;
  label?: string;
  /** Live query text for async sources (debounced by callers). */
  onQueryChange?: (query: string) => void;
}

/** Filterable command palette: type to filter, arrows + Enter to run, Escape to close. */
export function CommandMenu({
  open,
  onClose,
  items,
  onSelect,
  placeholder = "Type a command or search…",
  label = "Command menu",
  onQueryChange,
}: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && panelRef.current) trapTabKey(panelRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (restoreRef.current instanceof HTMLElement) {
        restoreRef.current.focus();
      }
    };
  }, [open ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  if (!open) return null;

  const close = () => {
    setQuery("");
    setActive(0);
    onQueryChange?.("");
    onClose();
  };

  const run = (id: string) => {
    setQuery("");
    setActive(0);
    onQueryChange?.("");
    onSelect(id);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) run(item.id);
    }
  };

  let lastGroup: string | undefined;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command menu"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            onQueryChange?.(e.target.value);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
          className={cx(
            "h-12 w-full border-b border-zinc-100 bg-transparent px-4 text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-900",
          )}
        />
        <ul
          id="command-list"
          role="listbox"
          aria-label="Results"
          className="max-h-72 overflow-y-auto p-1.5"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-zinc-500">
              No results for “{query}”.
            </li>
          ) : (
            filtered.map((item, i) => {
              const header =
                item.group !== lastGroup ? item.group : undefined;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {header ? (
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                      {header}
                    </p>
                  ) : null}
                  <button
                    id={`cmd-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onClick={() => run(item.id)}
                    onMouseEnter={() => setActive(i)}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                      focusRing,
                      i === active && "bg-zinc-100 dark:bg-zinc-900",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint ? (
                      <span className="shrink-0 text-xs text-zinc-500">{item.hint}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
