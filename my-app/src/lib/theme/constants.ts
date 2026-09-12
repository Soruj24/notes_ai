export const THEME_STORAGE_KEY = "notoai-theme";

export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export type ResolvedTheme = "light" | "dark";
