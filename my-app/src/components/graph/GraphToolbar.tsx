"use client";

import { Minus, Plus, Scan, RotateCcw } from "lucide-react";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export function GraphToolbar({ onZoomIn, onZoomOut, onFit, onReset }: Props) {
  const base = "inline-flex h-7 w-7 items-center justify-center border bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={`${base} border-r`}>
        <Plus size={13} strokeWidth={1.75} />
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={`${base} border-r`}>
        <Minus size={13} strokeWidth={1.75} />
      </button>
      <button type="button" onClick={onFit} aria-label="Fit graph" className={`${base} border-r`}>
        <Scan size={13} strokeWidth={1.75} />
      </button>
      <button type="button" onClick={onReset} aria-label="Reset view" className={base}>
        <RotateCcw size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
