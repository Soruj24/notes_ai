"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";

/** Topbar inbox bell with unread count. Mount-fetch only (manager owns live). */
export function AdminBell() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/notifications?limit=1", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as { unread?: number };
        if (!cancelled && typeof json.unread === "number") setUnread(json.unread);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/admin/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      <Bell size={16} aria-hidden="true" />
      {unread !== null && unread > 0 ? (
        <Badge
          size="sm"
          tone="danger"
          className="absolute -top-0.5 -right-0.5 min-w-4 justify-center px-1 tabular-nums"
        >
          {unread > 99 ? "99+" : unread}
        </Badge>
      ) : null}
    </Link>
  );
}
