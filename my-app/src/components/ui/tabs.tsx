"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { cx, focusRing } from "@/src/lib/utils/cx";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** Accessible tabs: roving tabindex, arrow/Home/End keys, automatic activation. */
export function Tabs({ tabs, value, defaultValue, onChange, className }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = value ?? internal;

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const onKey = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next !== null && tabs[next]) {
      e.preventDefault();
      select(tabs[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className={className}>
      <div role="tablist" aria-label="Tabs" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab, i) => {
          const selected = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                focusRing,
                "rounded-t-md",
                selected
                  ? "border-zinc-900 font-medium dark:border-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.id}`}
          aria-labelledby={`${baseId}-tab-${current.id}`}
          tabIndex={0}
          className={cx("py-4", focusRing, "rounded-md")}
        >
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
