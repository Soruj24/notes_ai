"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx, focusRing } from "@/src/lib/utils/cx";

export interface DropdownItem {
  id: string;
  label: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  onSelect: () => void;
}

interface DropdownProps {
  trigger: ReactNode;
  label: string;
  items: DropdownItem[];
  align?: "left" | "right";
}

/** Uncontrolled menu: click/Enter/Space toggle, arrows move, Escape closes. */
export function Dropdown({ trigger, label, items, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open ]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActive(0);
      setOpen(true);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      items[active]?.onSelect();
      close(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close(false) : (setActive(0), setOpen(true)))}
        onKeyDown={onTriggerKey}
        className={cx("inline-flex", focusRing, "rounded-lg")}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cx(
            "absolute z-50 mt-1.5 w-52 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={i === active ? 0 : -1}
              ref={i === active ? (el) => el?.focus() : undefined}
              onClick={() => {
                item.onSelect();
                close(false);
              }}
              onMouseEnter={() => setActive(i)}
              className={cx(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                focusRing,
                i === active && "bg-zinc-100 dark:bg-zinc-900",
                item.destructive ? "text-red-600" : "text-zinc-700 dark:text-zinc-300",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.shortcut ? (
                <kbd className="shrink-0 font-mono text-[11px] text-zinc-500">
                  {item.shortcut}
                </kbd>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
