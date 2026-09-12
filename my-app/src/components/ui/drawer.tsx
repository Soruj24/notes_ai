"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trapTabKey } from "@/src/lib/a11y/focus-trap";
import { cx } from "@/src/lib/utils/cx";
import { Button } from "@/src/components/ui/button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  label: string;
  children: ReactNode;
  className?: string;
}

/** Controlled slide-over. Same focus + scroll contract as Dialog. */
export function Drawer({
  open,
  onClose,
  side = "left",
  label,
  children,
  className,
}: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (panelRef.current) trapTabKey(panelRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (restoreRef.current instanceof HTMLElement) {
        restoreRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={cx("fixed inset-0 z-50", className)} role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={panelRef}
        className={cx(
          "absolute inset-y-0 flex w-[min(92vw,20rem)] flex-col bg-white shadow-xl outline-none dark:bg-zinc-950",
          side === "left" ? "left-0" : "right-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-900">
          <span className="text-sm font-semibold">{label}</span>
          <Button
            ref={closeRef}
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close panel"
            className="touch-44"
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
