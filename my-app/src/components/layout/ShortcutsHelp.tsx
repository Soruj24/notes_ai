"use client";

import { Dialog } from "@/src/components/ui/dialog";
import { formatBinding } from "@/src/lib/keyboard/match";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_DOCS,
} from "@/src/lib/keyboard/defaults";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

/** Help modal: every shortcut, grouped, with platform-aware labels. */
export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Sequences press one key, then the next. Shortcuts never fire while typing."
    >
      <div className="grid max-h-[50vh] gap-4 overflow-y-auto">
        {SHORTCUT_DOCS.map((section) => (
          <div key={section.group}>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              {section.group}
            </p>
            <ul className="mt-1.5 grid gap-1">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-1 py-1 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    {item.label}
                    {item.note ? (
                      <span className="ml-1.5 text-xs text-zinc-500">({item.note})</span>
                    ) : null}
                  </span>
                  <kbd className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] whitespace-nowrap dark:border-zinc-800 dark:bg-zinc-900">
                    {formatBinding(DEFAULT_SHORTCUTS[item.id])}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
