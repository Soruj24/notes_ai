export interface ParsedChord {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  mod: boolean;
}

/** Parse "mod+k", "ctrl+/", "alt+t", "Escape" into a comparable chord. */
export function parseChord(binding: string): ParsedChord {
  const parts = binding.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  return {
    key,
    ctrl: mods.has("ctrl") || mods.has("control"),
    meta: mods.has("meta") || mods.has("cmd") || mods.has("command"),
    shift: mods.has("shift"),
    alt: mods.has("alt") || mods.has("option"),
    mod: mods.has("mod"),
  };
}

/**
 * Normalize a binding to its chord sequence. A single string is one chord
 * ("mod+k"); an array is a key sequence ("g" then "d").
 */
export function normalizeBinding(keys: string | string[]): string[] {
  return Array.isArray(keys) ? keys : [keys];
}

function isMod(event: KeyboardEvent): boolean {
  // macOS: Cmd; Windows/Linux: Ctrl. Accept either so shortcuts work cross-platform.
  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform);
  return isMac ? event.metaKey : event.ctrlKey;
}

/** True when the keyboard event satisfies a single-chord binding. */
export function matchesChord(event: KeyboardEvent, binding: string): boolean {
  const chord = parseChord(binding);
  const modOk = chord.mod ? isMod(event) : true;
  if (!modOk) return false;
  if (chord.ctrl && !event.ctrlKey) return false;
  if (chord.meta && !event.metaKey) return false;
  if (chord.shift && !event.shiftKey) return false;
  if (chord.alt && !event.altKey) return false;
  // Reject extra modifiers not in the binding (except the mod alias itself).
  if (!chord.ctrl && !chord.mod && event.ctrlKey) return false;
  if (!chord.meta && !chord.mod && event.metaKey) return false;
  if (!chord.shift && event.shiftKey && chord.key.length > 1) return false;
  if (!chord.alt && event.altKey) return false;
  const pressed = event.key.toLowerCase();
  // Layout quirk: Shift+/ produces "?" while the chord says "shift+/".
  if (chord.shift && chord.key === "/") {
    return pressed === "/" || pressed === "?";
  }
  return pressed === chord.key;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Human label for a chord, adjusted to the current platform. */
export function formatChord(binding: string): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform);
  return binding
    .split("+")
    .map((part) => {
      const p = part.trim().toLowerCase();
      if (p === "mod") return isMac ? "⌘" : "Ctrl";
      if (p === "shift") return "Shift";
      if (p === "ctrl" || p === "control") return "Ctrl";
      if (p === "alt" || p === "option") return isMac ? "⌥" : "Alt";
      if (p === "meta" || p === "cmd" || p === "command") return "⌘";
      if (p === " ") return "Space";
      return p.length === 1 ? p.toUpperCase() : p;
    })
    .join(isMac ? "" : "+");
}

/** Human label for a full binding, joining sequences with " then ". */
export function formatBinding(keys: string | string[]): string {
  const chords = normalizeBinding(keys);
  if (chords.length === 1) return formatChord(chords[0]);
  return chords.map(formatChord).join(" then ");
}
