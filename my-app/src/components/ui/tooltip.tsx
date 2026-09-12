"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

interface TooltipProps {
  content: ReactNode;
  side?: "top" | "bottom";
  children: ReactNode;
}

/** Hover/focus tooltip. Escape dismisses; content exposed via aria-describedby. */
export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setVisible(false);
      }}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible ? (
        <span
          id={id}
          role="tooltip"
          className={cx(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-xs break-words shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
