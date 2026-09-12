"use client";

import { AIChat } from "@/src/components/assistant/AIChat";
import { Drawer } from "@/src/components/ui/drawer";

interface AICommandPanelProps {
  wid: string | null;
  open: boolean;
  onClose: () => void;
}

/** Slide-over command center, available on every workspace route. */
export function AICommandPanel({ wid, open, onClose }: AICommandPanelProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" label="AI Assistant">
      <div className="flex h-full flex-col p-3">
        {wid ? (
          <AIChat wid={wid} />
        ) : (
          <p className="text-sm text-zinc-500">Resolving workspace…</p>
        )}
      </div>
    </Drawer>
  );
}
