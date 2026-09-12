"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover } from "@/src/components/ui/popover";
import { cx, focusRing } from "@/src/lib/utils/cx";

export interface OptionMenuOption<T extends string | number> {
  value: T;
  label: string;
}

interface OptionMenuProps<T extends string | number> {
  label: string;
  /** Use a visible external label instead of aria-label. */
  labelledBy?: string;
  value: T;
  options: Array<OptionMenuOption<T>>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  widthClass?: string;
}

/**
 * Generic custom dropdown (never a native select). Compact trigger with the
 * current label + chevron; popover listbox with roving focus, arrow-key
 * navigation, Enter to commit, and a selected check mark.
 */
export function OptionMenu<T extends string | number>({
  label,
  labelledBy,
  value,
  options,
  onChange,
  size = "sm",
  className,
  widthClass = "w-44",
}: OptionMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );
  const listRef = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value);

  function bestIndex(): number {
    return Math.max(
      0,
      options.findIndex((o) => o.value === value),
    );
  }

  // Focus-only effect: active is synced in event handlers below.
  useEffect(() => {
    if (!open) return;
    const idx = active;
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
        ?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  function commitAt(idx: number) {
    const option = options[idx];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => {
        const next = (i + 1) % options.length;
        listRef.current
          ?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
          ?.focus();
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => {
        const next = (i - 1 + options.length) % options.length;
        listRef.current
          ?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
          ?.focus();
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="0"]`)?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${options.length - 1}"]`)
        ?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitAt(active);
    }
  }

  return (
    <span className={cx("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => {
          if (open) setOpen(false);
          else {
            setActive(bestIndex());
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labelledBy ? undefined : `${label}, current: ${current?.label ?? value}`}
        aria-labelledby={labelledBy}
        className={cx(
          "flex w-full items-center gap-1 rounded-lg border border-zinc-200 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
          focusRing,
          size === "md" ? "h-9 px-3 text-sm" : "h-8 px-2 text-xs",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left tabular-nums">{current?.label ?? String(value)}</span>
        <ChevronDown size={12} aria-hidden="true" className="shrink-0 text-zinc-400" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} label={label} widthClass={widthClass}>
        {open ? (
          <ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            onKeyDown={onListKey}
            className="grid max-h-64 gap-0.5 overflow-y-auto p-1.5"
          >
            {options.map((option, idx) => {
              const selected = option.value === value;
              return (
                <li key={String(option.value)}>
                  <button
                    type="button"
                    data-idx={idx}
                    role="option"
                    aria-selected={selected}
                    tabIndex={active === idx ? 0 : -1}
                    onClick={() => commitAt(idx)}
                    onMouseEnter={() => setActive(idx)}
                    onFocus={() => setActive(idx)}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs tabular-nums transition-colors",
                      focusRing,
                      selected
                        ? "bg-zinc-100 font-medium dark:bg-zinc-900"
                        : active === idx
                          ? "bg-zinc-50 dark:bg-zinc-900/60"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected ? (
                      <Check size={13} aria-hidden="true" className="shrink-0" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Popover>
    </span>
  );
}
