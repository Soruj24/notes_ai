"use client";

import { useEffect, useRef } from "react";
import { trapTabKey } from "@/src/lib/a11y/focus-trap";
import { cx } from "@/src/lib/utils/cx";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  label: string;
  align?: "left" | "right";
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Anchored popover on desktop, bottom sheet on phones.
 * Escape + outside-press close; Tab cycles inside while open.
 */
export function Popover({ open, onClose, label, align = "left", widthClass = "w-72", children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (panelRef.current) trapTabKey(panelRef.current, e);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      {/* Mobile scrim: bottom-sheet affordance. Desktop clicks pass to outside-press. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/30 sm:hidden"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label={label}
        tabIndex={-1}
        className={cx(
          "popover-in z-50 rounded-xl border border-zinc-200 bg-white shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950",
          // Bottom sheet on phones, anchored popover on sm+.
          "fixed inset-x-3 bottom-3 top-auto max-h-[80dvh] overflow-y-auto",
          `sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:max-h-none sm:w-auto sm:overflow-visible ${widthClass}`,
          align === "right" ? "sm:right-0" : "sm:left-0",
        )}
      >
        {children}
      </div>
    </>
  );
}
