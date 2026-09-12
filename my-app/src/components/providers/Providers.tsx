"use client";

import { ShortcutProvider } from "@/src/components/providers/ShortcutProvider";
import { ThemeProvider } from "@/src/components/providers/ThemeProvider";
import { ReduxProvider } from "@/src/components/providers/ReduxProvider";
import { ToastProvider } from "@/src/components/ui/toast";
import { FeaturesProvider } from "@/src/lib/features/client";

/** Client provider composition. Root layout (server) renders this once. */
export function Providers({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme?: "system" | "light" | "dark";
}) {
  return (
    <ReduxProvider>
      <ThemeProvider defaultTheme={defaultTheme}>
        <ShortcutProvider>
          <ToastProvider>
            <FeaturesProvider>{children}</FeaturesProvider>
          </ToastProvider>
        </ShortcutProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
