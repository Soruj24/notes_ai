"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx, focusRing } from "@/src/lib/utils/cx";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastItem {
  id: number;
  title: ReactNode;
  description?: ReactNode;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (title: ReactNode, options?: { description?: ReactNode; tone?: ToastTone }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const tones: Record<ToastTone, string> = {
  info: "border-zinc-200 dark:border-zinc-800",
  success: "border-emerald-600/30",
  warning: "border-amber-600/30",
  danger: "border-red-600/30",
};

/** Toast state + viewport. Mount once near the root (see Providers). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: ReactNode, options?: { description?: ReactNode; tone?: ToastTone }) => {
      const id = nextId++;
      const tone = options?.tone ?? "info";
      setItems((prev) => [...prev.slice(-3), { id, title, description: options?.description, tone }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cx(
              "pointer-events-auto rounded-xl border bg-white p-3 shadow-lg dark:bg-zinc-950",
              tones[item.tone],
            )}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className={cx("touch-44 rounded-md px-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100", focusRing)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
