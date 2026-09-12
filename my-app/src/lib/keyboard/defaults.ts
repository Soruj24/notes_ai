/**
 * Canonical shortcut IDs and chords. Feature code must reuse these,
 * never hardcode chords. Arrays are key SEQUENCES (press in order).
 *
 * Browser note: mod+n / mod+t / mod+shift+t are reserved by browsers and
 * cannot be intercepted on the web — they work in desktop wrappers and
 * every action below is also reachable via palette and buttons.
 */
export const SHORTCUT_IDS = {
  commandPalette: "command-palette",
  toggleSidebar: "toggle-sidebar",
  toggleTheme: "toggle-theme",
  assistantPanel: "assistant-panel",
  newNote: "new-note",
  newTask: "new-task",
  openAi: "open-ai",
  goDashboard: "go-dashboard",
  goNotes: "go-notes",
  goTasks: "go-tasks",
  showHelp: "show-help",
  closeOverlay: "close-overlay",
} as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[keyof typeof SHORTCUT_IDS];

/** Default chords. Single source of truth; remapping UI can build on this later. */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, string | string[]> = {
  [SHORTCUT_IDS.commandPalette]: "mod+k",
  [SHORTCUT_IDS.toggleSidebar]: "mod+b",
  [SHORTCUT_IDS.toggleTheme]: "alt+t",
  [SHORTCUT_IDS.assistantPanel]: "alt+a",
  [SHORTCUT_IDS.newNote]: "mod+n",
  [SHORTCUT_IDS.newTask]: "mod+shift+t",
  [SHORTCUT_IDS.openAi]: "mod+/",
  [SHORTCUT_IDS.goDashboard]: ["g", "d"],
  [SHORTCUT_IDS.goNotes]: ["g", "n"],
  [SHORTCUT_IDS.goTasks]: ["g", "t"],
  [SHORTCUT_IDS.showHelp]: "shift+/",
  [SHORTCUT_IDS.closeOverlay]: "Escape",
};

/** Help modal content, grouped. Rendered by ShortcutsHelp. */
export const SHORTCUT_DOCS: Array<{
  group: string;
  items: Array<{ id: ShortcutId; label: string; note?: string }>;
}> = [
  {
    group: "General",
    items: [
      { id: SHORTCUT_IDS.commandPalette, label: "Search and commands" },
      { id: SHORTCUT_IDS.showHelp, label: "This help" },
      { id: SHORTCUT_IDS.toggleSidebar, label: "Toggle sidebar" },
      { id: SHORTCUT_IDS.toggleTheme, label: "Toggle theme" },
      { id: SHORTCUT_IDS.closeOverlay, label: "Close dialogs and panels" },
    ],
  },
  {
    group: "Create",
    items: [
      { id: SHORTCUT_IDS.newNote, label: "New note", note: "Browser-reserved on web" },
      { id: SHORTCUT_IDS.newTask, label: "New task", note: "Browser-reserved on web" },
      { id: SHORTCUT_IDS.openAi, label: "Open AI assistant" },
    ],
  },
  {
    group: "Navigate",
    items: [
      { id: SHORTCUT_IDS.goDashboard, label: "Go to dashboard" },
      { id: SHORTCUT_IDS.goNotes, label: "Go to notes" },
      { id: SHORTCUT_IDS.goTasks, label: "Go to tasks" },
    ],
  },
];

/** Dispatched when the palette shortcut fires; the palette listens for it. */
export const PALETTE_EVENT = "notoai:palette";

export function dispatchPaletteEvent(): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}
