"use client";

import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from "lucide-react";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export function GraphToolbar({ onZoomIn, onZoomOut, onFit, onReset }: Props) {
  const btn = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950";
  return (
    <div className="flex gap-1">
      <button onClick={onZoomIn} className={btn} aria-label="Zoom in">
        <ZoomIn size={14} />
      </button>
      <button onClick={onZoomOut} className={btn} aria-label="Zoom out">
        <ZoomOut size={14} />
      </button>
      <button onClick={onFit} className={btn} aria-label="Fit graph">
        <Maximize2 size={14} />
      </button>
      <button onClick={onReset} className={btn} aria-label="Reset view">
        <RefreshCw size={14} />
      </button>
    </div>
  );
}
