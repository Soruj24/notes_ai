"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MainContent } from "@/src/components/layout/MainContent";
import { MobileNav } from "@/src/components/layout/MobileNav";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";
import { NAV_SECTIONS } from "@/src/components/layout/nav";
import { AICommandPanel } from "@/src/components/assistant/AICommandPanel";
import { BottomNav } from "@/src/components/layout/BottomNav";
import { NotificationBell } from "@/src/components/notifications/NotificationBell";
import { NotificationCenter } from "@/src/components/notifications/NotificationCenter";
import { useRealtimeSync } from "@/src/components/realtime/useRealtimeSync";
import { ShortcutsHelp } from "@/src/components/layout/ShortcutsHelp";
import { useWorkspaceShortcuts } from "@/src/hooks/useWorkspaceShortcuts";
import { SearchPalette } from "@/src/components/search/SearchPalette";
import { CommandMenu } from "@/src/components/ui/command-menu";
import type { SearchCommand } from "@/src/lib/search/types";
import { createWorkspaceSearchSource } from "@/src/lib/search/workspace-source";
import { useTheme } from "@/src/hooks/useTheme";
import { filterNavSections, type PlatformRole } from "@/src/lib/rbac/roles";
import { useFeatures } from "@/src/lib/features/client";
import { useShortcut } from "@/src/hooks/useShortcut";
import {
  DEFAULT_SHORTCUTS,
  PALETTE_EVENT,
  SHORTCUT_IDS,
} from "@/src/lib/keyboard/defaults";

const SIDEBAR_KEY = "notoai-sidebar-collapsed";

function getCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Persistent workspace shell. Mounted once by (app)/layout; route changes
 * replace only MainContent children, so sidebar/topbar state is preserved
 * and no full-page remount or layout jump occurs.
 */
export function AppShell({
  children,
  userId,
  role,
  siteName,
}: {
  children: React.ReactNode;
  userId: string | null;
  /** Platform role from the server layout — drives centralized nav gating. */
  role: PlatformRole | null;
  /** Product brand from settings. */
  siteName: string;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [wid, setWid] = useState<string | null>(null);
  const storedCollapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    () => false,
  );
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(
    null,
  );
  const collapsed = collapsedOverride ?? storedCollapsed;
  const { toggle: toggleTheme } = useTheme();
  // Single domain socket for the session: auth, dedupe, and RTK
  // reconciliation live here; polling underneath covers outages.
  useRealtimeSync(wid, userId);

  const toggleSidebar = useCallback(() => {
    const next = !(collapsedOverride ?? getCollapsedSnapshot());
    setCollapsedOverride(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      // Private mode: state still applies for this session.
    }
  }, [collapsedOverride]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const closeCenter = useCallback(() => setCenterOpen(false), []);

  // Resolve the workspace lazily on first overlay open (shell is route-free).
  const ensureWid = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) return;
        const json = (await res.json()) as { workspaces: Array<{ id: string }> };
        if (json.workspaces[0]) setWid(json.workspaces[0].id);
      } catch {
        // Overlays still open; data surfaces show their own error states.
      }
    })();
  }, []);
  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    ensureWid();
  }, [ensureWid]);
  const toggleAssistant = useCallback(() => {
    setAssistantOpen((v) => !v);
    ensureWid();
  }, [ensureWid]);
  const openCenter = useCallback(() => {
    setCenterOpen(true);
    ensureWid();
  }, [ensureWid]);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // External dispatchers (e.g. Topbar search) can open the palette by event.
  useEffect(() => {
    window.addEventListener(PALETTE_EVENT, openPalette);
    return () => window.removeEventListener(PALETTE_EVENT, openPalette);
  }, [openPalette]);

  const { enabled: flagOn, loaded: flagsLoaded } = useFeatures();
  const commands = useMemo<SearchCommand[]>(
    () => [
      // Role- and flag-filtered like the sidebar, so staff-only and
      // disabled entries never surface where they shouldn't.
      ...filterNavSections(NAV_SECTIONS, role)
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.flag || !flagsLoaded || flagOn(item.flag)),
        }))
        .filter((section) => section.items.length > 0)
        .flatMap((section) =>
        section.items.map((item) => ({
          id: `go:${item.href}`,
          label: `Go to ${item.label}`,
          group: "Go to",
          run: () => router.push(item.href),
        })),
      ),
      {
        id: "action:toggle-sidebar",
        label: "Toggle sidebar",
        hint: "⌘B",
        group: "Actions",
        run: () => toggleSidebar(),
      },
      {
        id: "action:toggle-theme",
        label: "Toggle theme",
        hint: "Alt+T",
        group: "Actions",
        run: () => toggleTheme(),
      },
      {
        id: "action:assistant",
        label: "Open AI assistant",
        hint: "Alt+A",
        group: "Actions",
        run: () => toggleAssistant(),
      },
      {
        id: "action:shortcuts",
        label: "Show keyboard shortcuts",
        hint: "?",
        group: "Actions",
        run: () => openHelp(),
      },
    ],
    [router, role, flagOn, flagsLoaded, toggleSidebar, toggleTheme, toggleAssistant, openHelp],
  );

  const source = useMemo(
    () => (wid ? createWorkspaceSearchSource(wid) : null),
    [wid],
  );

  useShortcut(
    SHORTCUT_IDS.toggleSidebar,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.toggleSidebar],
    toggleSidebar,
    { description: "Toggle sidebar" },
  );
  useShortcut(
    SHORTCUT_IDS.commandPalette,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.commandPalette],
    openPalette,
    { description: "Open command palette" },
  );
  useShortcut(
    SHORTCUT_IDS.toggleTheme,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.toggleTheme],
    toggleTheme,
    { description: "Toggle theme" },
  );
  useShortcut(
    SHORTCUT_IDS.assistantPanel,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.assistantPanel],
    toggleAssistant,
    { description: "Toggle AI Assistant" },
  );
  useShortcut(
    SHORTCUT_IDS.closeOverlay,
    DEFAULT_SHORTCUTS[SHORTCUT_IDS.closeOverlay],
    () => {
      // Topmost first: help, palette, assistant, notifications, mobile nav.
      if (helpOpen) closeHelp();
      else if (paletteOpen) closePalette();
      else if (assistantOpen) closeAssistant();
      else if (centerOpen) closeCenter();
      else if (mobileOpen) closeMobile();
    },
    { description: "Close dialogs and panels" },
  );
  useWorkspaceShortcuts({ wid, onAssistant: toggleAssistant, onHelp: openHelp });

  return (
    <div className="flex min-h-dvh bg-white text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-2 focus:outline-indigo-500"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} role={role} siteName={siteName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenu={openMobile}
          onToggleSidebar={toggleSidebar}
          onSearch={openPalette}
          onAssistant={toggleAssistant}
          notifications={
            <NotificationBell wid={wid} userId={userId} onOpen={openCenter} />
          }
        />
        <MainContent>{children}</MainContent>
      </div>
      <MobileNav open={mobileOpen} onClose={closeMobile} role={role} siteName={siteName} />
      <BottomNav onSearch={openPalette} onMore={openMobile} />
      <ShortcutsHelp open={helpOpen} onClose={closeHelp} />
      <NotificationCenter wid={wid} open={centerOpen} onClose={closeCenter} />
      <AICommandPanel wid={wid} open={assistantOpen} onClose={closeAssistant} />
      {paletteOpen && wid && source ? (
        <SearchPalette
          wid={wid}
          source={source}
          commands={commands}
          onClose={closePalette}
          onNavigate={(href) => router.push(href)}
        />
      ) : null}
      {paletteOpen && !wid ? (
        <CommandMenu
          open
          onClose={closePalette}
          items={commands.map((c) => ({
            id: c.id,
            label: c.label,
            hint: c.hint,
            group: c.group,
          }))}
          onSelect={(id) => {
            closePalette();
            commands.find((c) => c.id === id)?.run();
          }}
        />
      ) : null}
    </div>
  );
}
