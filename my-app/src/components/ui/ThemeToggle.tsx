"use client";

import { Button } from "@/src/components/ui/button";
import { useTheme } from "@/src/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

/** Theme cycle button: system -> light -> dark. Title documents the shortcut. */
export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  return (
    <Button
      size="icon"
      variant="outline"
      onClick={() => setTheme(next)}
      title={`Theme: ${theme} (Alt+T switches)`}
      aria-label={`Switch theme, current ${resolved}`}
    >
      <span aria-hidden="true" className="flex text-sm">
        {resolved === "dark" ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </Button>
  );
}
