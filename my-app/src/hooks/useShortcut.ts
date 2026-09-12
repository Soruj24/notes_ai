"use client";

import { useEffect, useRef } from "react";
import { useShortcutContext } from "@/src/components/providers/ShortcutProvider";
import type {
  ShortcutHandler,
  ShortcutOptions,
} from "@/src/lib/keyboard/types";

/**
 * Register a keyboard shortcut for the component lifetime.
 * `keys` must be a stable reference (e.g. DEFAULT_SHORTCUTS); the handler
 * stays fresh via refs so registration never re-subscribes per render.
 */
export function useShortcut(
  id: string,
  keys: string | string[],
  handler: ShortcutHandler,
  options?: ShortcutOptions,
): void {
  const { register, unregister } = useShortcutContext();
  const latest = useRef({ keys, handler, options });

  // Keep registration payload fresh without re-subscribing.
  useEffect(() => {
    latest.current = { keys, handler, options };
  });

  useEffect(() => {
    const snapshot = latest.current;
    register(id, snapshot.keys, (e) => latest.current.handler(e), snapshot.options);
    return () => unregister(id);
  }, [id, register, unregister]);
}
