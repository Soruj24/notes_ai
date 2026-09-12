export type ShortcutScope = "global" | "workspace";

export interface ShortcutOptions {
  /** Fire even when focus is in an input/textarea/select or contentEditable. */
  allowInInputs?: boolean;
  /** Restrict handling to a scope. Currently informational; enforcement is opt-in. */
  scope?: ShortcutScope;
  /** Human-readable description for future shortcut-help UI. */
  description?: string;
}

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutBinding {
  id: string;
  keys: string | string[];
  handler: ShortcutHandler;
  options?: ShortcutOptions;
}
