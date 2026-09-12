"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";
import {
  useListNotificationsQuery,
  useReadAllNotificationsMutation,
  useSetNotificationStatusMutation,
  type NotificationDTO,
} from "@/src/store/notificationsApi";

interface NotificationListProps {
  wid: string;
  filter?: "unread" | "all";
}

/** Inbox list with read/dismiss actions. Used by the drawer and the page. */
export function NotificationList({ wid, filter = "all" }: NotificationListProps) {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useListNotificationsQuery({
    wid,
    status: filter === "unread" ? "unread" : undefined,
  });
  const [setStatus] = useSetNotificationStatusMutation();
  const [readAll] = useReadAllNotificationsMutation();

  async function act(id: string, status: "read" | "dismissed", error: string) {
    try {
      await setStatus({ wid, id, status }).unwrap();
    } catch {
      toast(error, { tone: "danger" });
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-2" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <p className="text-sm text-zinc-500">
        Could not load notifications.{" "}
        <button type="button" onClick={() => refetch()} className="font-medium underline">
          Retry
        </button>
      </p>
    );
  }
  if (data.notifications.length === 0) {
    return <p className="text-sm text-zinc-500">All caught up. Nothing here.</p>;
  }

  return (
    <div className="grid gap-2">
      {data.unread > 0 ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void readAll({ wid })
                .unwrap()
                .catch(() => toast("Could not mark all read.", { tone: "danger" }));
            }}
          >
            Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-1.5">
        {data.notifications.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onRead={() => void act(n.id, "read", "Could not mark as read.")}
            onDismiss={() => void act(n.id, "dismissed", "Could not dismiss.")}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({
  notification: n,
  onRead,
  onDismiss,
}: {
  notification: NotificationDTO;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.status === "unread" ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"}`}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${n.status === "unread" ? "font-medium" : ""}`}>
          {n.title}
        </span>
        {n.body && n.body !== n.title ? (
          <span className="block truncate text-xs text-zinc-500">{n.body}</span>
        ) : null}
          <span className="block text-[11px] text-zinc-500">
          {new Date(n.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </span>
      <span className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {n.status === "unread" ? (
          <button
            type="button"
            onClick={onRead}
            aria-label={`Mark "${n.title}" as read`}
            className="rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <Check size={14} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss "${n.title}"`}
              className="rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </span>
    </>
  );
  const classes =
    "flex w-full items-start gap-2.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700";
  if (n.linkHref) {
    return (
      <li>
        <Link href={n.linkHref} onClick={n.status === "unread" ? onRead : undefined} className={classes}>
          {body}
        </Link>
      </li>
    );
  }
  return <li className={classes}>{body}</li>;
}
