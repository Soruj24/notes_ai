"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  isEditableTarget,
  matchesChord,
  normalizeBinding,
} from "@/src/lib/keyboard/match";
import type {
  ShortcutBinding,
  ShortcutHandler,
  ShortcutOptions,
} from "@/src/lib/keyboard/types";

interface ShortcutContextValue {
  register: (
    id: string,
    keys: string | string[],
    handler: ShortcutHandler,
    options?: ShortcutOptions,
  ) => void;
  unregister: (id: string) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

/** Window to complete a multi-key sequence before it resets. */
const SEQUENCE_TIMEOUT_MS = 1200;

interface PendingSequence {
  id: string;
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

export function ShortcutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const registry = useRef(new Map<string, ShortcutBinding>());
  const pendingRef = useRef<PendingSequence | null>(null);

  const register = useCallback<ShortcutContextValue["register"]>(
    (id, keys, handler, options) => {
      registry.current.set(id, { id, keys, handler, options });
    },
    [],
  );

  const unregister = useCallback<ShortcutContextValue["unregister"]>((id) => {
    registry.current.delete(id);
    if (pendingRef.current?.id === id) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
  }, []);

  // Single global listener; registered handlers stay fresh via the ref map.
  // Arrays are key SEQUENCES ("g" then "d"), matched progressively.
  useEffect(() => {
    const clearPending = () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current = null;
      }
    };

    const armPending = (id: string, index: number) => {
      clearPending();
      pendingRef.current = {
        id,
        index,
        timer: setTimeout(clearPending, SEQUENCE_TIMEOUT_MS),
      };
    };

    const fire = (binding: ShortcutBinding, event: KeyboardEvent) => {
      clearPending();
      // Never steal keys from text fields unless explicitly allowed.
      if (!binding.options?.allowInInputs && isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      binding.handler(event);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const pending = pendingRef.current;
      for (const binding of registry.current.values()) {
        const chords = normalizeBinding(binding.keys);
        if (chords.length === 1) {
          if (matchesChord(event, chords[0])) {
            fire(binding, event);
            return;
          }
          continue;
        }
        const step = pending && pending.id === binding.id ? pending.index : 0;
        if (matchesChord(event, chords[step])) {
          if (step === chords.length - 1) {
            fire(binding, event);
          } else {
            armPending(binding.id, step + 1);
          }
          return;
        }
        if (pending && pending.id === binding.id) {
          clearPending();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPending();
    };
  }, []);

  const value = useMemo(() => ({ register, unregister }), [register, unregister]);
  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcutContext(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext);
  if (!ctx)
    throw new Error("useShortcut must be used within ShortcutProvider");
  return ctx;
}
