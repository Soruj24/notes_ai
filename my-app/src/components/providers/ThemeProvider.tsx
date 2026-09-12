"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/src/lib/theme/constants";

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function isValidTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredSnapshot(fallback: Theme): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSystemSnapshot(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches;
}

function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  /** Admin-configured default when no preference is stored. */
  defaultTheme?: Theme;
}) {
  // External stores: no hydration-mismatch, no setState-in-effect.
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => getStoredSnapshot(defaultTheme),
    () => defaultTheme,
  );
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    () => false,
  );
  const [override, setOverride] = useState<Theme | null>(null);

  const theme: Theme = override ?? stored;
  const resolved: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Sync React state to the DOM only (external system). No setState here.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((next: Theme) => {
    setOverride(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode: state still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    const base = override ?? getStoredSnapshot(defaultTheme);
    const current: ResolvedTheme =
      base === "system" ? (getSystemSnapshot() ? "dark" : "light") : base;
    setTheme(current === "dark" ? "light" : "dark");
  }, [override, setTheme, defaultTheme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
