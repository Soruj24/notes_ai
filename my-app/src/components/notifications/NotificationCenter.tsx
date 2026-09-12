"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NotificationList } from "@/src/components/notifications/NotificationList";
import { Drawer } from "@/src/components/ui/drawer";

interface NotificationCenterProps {
  wid: string | null;
  open: boolean;
  onClose: () => void;
}

/** Slide-over inbox. Full history lives on /notifications. */
export function NotificationCenter({ wid, open, onClose }: NotificationCenterProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" label="Notifications">
      <div className="grid gap-3 p-4">
        {wid ? (
          <>
            <NotificationList wid={wid} />
            <Link
              href="/notifications"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1 text-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Open notification history
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Resolving workspace…</p>
        )}
      </div>
    </Drawer>
  );
}
