"use client";

import { Button } from "@/src/components/ui/button";
import { Tooltip } from "@/src/components/ui/tooltip";
import { useListNotificationsQuery } from "@/src/store/notificationsApi";

interface NotificationBellProps {
  wid: string | null;
  userId: string | null;
  onOpen: () => void;
}

/**
 * Inbox bell with unread badge. Polls every 15s; the socket hook
 * invalidates sooner when a push server is reachable.
 */
export function NotificationBell({ wid, userId, onOpen }: NotificationBellProps) {
  const { data } = useListNotificationsQuery(
    { wid: wid ?? "" },
    {
      skip: !wid || !userId,
      pollingInterval: 15000,
    },
  );
  const unread = data?.unread ?? 0;

  return (
    <Tooltip content="Notifications">
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpen}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative"
      >
        <span aria-hidden="true" className="text-lg leading-none">🔔</span>
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
    </Tooltip>
  );
}
