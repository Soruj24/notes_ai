"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { trapTabKey } from "@/src/lib/a11y/focus-trap";
import { Button } from "@/src/components/ui/button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Controlled modal. Escape + overlay click close; focus moves in and back. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="popover-in relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_50px_-12px_rgb(0_0_0/0.25)] outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)]"
      >
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <h2 id={titleId} className="pr-8 text-[15px] font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>
        <div className="px-5 py-4 text-sm sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:flex-row sm:justify-end dark:border-zinc-800/80 dark:bg-zinc-900/40">
            {footer}
          </div>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close dialog"
          className="touch-44 absolute top-3 right-3 h-8 w-8"
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
