"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Centralized frontend feature state. Fetched once per session from
 * GET /api/config (evaluated server-side for the current user) and shared
 * via context. Display-only: every sensitive surface re-checks server-side.
 *
 * Loading policy is fail-open — flagged items render until the map
 * arrives, so first paint never hides working features.
 */

interface FeaturesContextValue {
  flags: Record<string, boolean>;
  loaded: boolean;
  enabled: (key: string) => boolean;
  refresh: () => void;
}

const FeaturesContext = createContext<FeaturesContextValue>({
  flags: {},
  loaded: false,
  enabled: () => true,
  refresh: () => undefined,
});

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as { flags?: Record<string, boolean> };
        if (!cancelled && json.flags) {
          setFlags(json.flags);
          setLoaded(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = useMemo<FeaturesContextValue>(
    () => ({
      flags,
      loaded,
      enabled: (key: string) => (loaded ? (flags[key] ?? true) : true),
      refresh,
    }),
    [flags, loaded, refresh],
  );
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeaturesContextValue {
  return useContext(FeaturesContext);
}

/** Render children only when the flag is on (after load; fail-open while loading). */
export function FeatureGate({ feature, children, fallback = null }: { feature: string; children: ReactNode; fallback?: ReactNode }) {
  const { enabled, loaded } = useFeatures();
  if (!loaded) return <>{children}</>;
  return enabled(feature) ? <>{children}</> : <>{fallback}</>;
}
