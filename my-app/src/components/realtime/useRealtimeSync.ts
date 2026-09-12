"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { DomainEvent } from "@/src/lib/realtime/domain";
import { useAppDispatch } from "@/src/store/hooks";
import { analyticsApi } from "@/src/store/analyticsApi";
import { dashboardApi } from "@/src/store/dashboardApi";
import { notesApi } from "@/src/store/notesApi";
import { notificationsApi } from "@/src/store/notificationsApi";
import { scheduleApi } from "@/src/store/scheduleApi";
import { tasksApi } from "@/src/store/tasksApi";

const MAX_SEEN = 300;

function socketUrl(): string | null {
  if (process.env.SOCKET_ENABLED === "0") return null;
  if (typeof window === "undefined") return null;
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
}

/**
 * Domain-event sync for one workspace. Auth rides the session cookie
 * (withCredentials); the server drops anonymous sockets at handshake.
 *
 * - Duplicate protection: event ids are remembered (LRU-capped) and replays ignored.
 * - Reconnect: socket.io backoff reconnects, then we resubscribe and
 *   invalidate everything (catch-up for the outage window).
 * - Reconciliation: events only invalidate caches; refetch converges
 *   optimistic local state with server truth.
 * - No leaks: exactly one socket per mount; every listener removed on cleanup.
 */
export function useRealtimeSync(
  wid: string | null,
  userId: string | null,
): void {
  const dispatch = useAppDispatch();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wid || !userId) return;
    const url = socketUrl();
    if (!url) return;

    const seen = seenRef.current;
    const remember = (id: string): boolean => {
      if (seen.has(id)) return false;
      seen.add(id);
      if (seen.size > MAX_SEEN) {
        const oldest = seen.values().next().value as string | undefined;
        if (oldest) seen.delete(oldest);
      }
      return true;
    };

    const invalidateFor = (type: DomainEvent["type"]): void => {
      if (type.startsWith("note.")) {
        dispatch(notesApi.util.invalidateTags(["NoteLists"]));
        dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
      } else if (type.startsWith("task.")) {
        dispatch(tasksApi.util.invalidateTags(["TaskLists", "TaskCounts"]));
        dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
        dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
        dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
      } else if (type.startsWith("event.")) {
        dispatch(scheduleApi.util.invalidateTags(["EventLists", "Schedule"]));
        dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
      } else if (type === "goal.updated" || type === "project.updated") {
        dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
      } else if (type === "notification.created") {
        dispatch(notificationsApi.util.invalidateTags(["Notifications"]));
      }
    };

    const invalidateAll = (): void => {
      dispatch(notesApi.util.invalidateTags(["NoteLists"]));
      dispatch(tasksApi.util.invalidateTags(["TaskLists", "TaskCounts"]));
      dispatch(scheduleApi.util.invalidateTags(["EventLists", "Schedule"]));
      dispatch(dashboardApi.util.invalidateTags(["Dashboard"]));
      dispatch(notificationsApi.util.invalidateTags(["Notifications"]));
      dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
    };

    const onDomain = (event: DomainEvent): void => {
      if (!event || typeof event !== "object") return;
      if (event.workspaceId !== wid) return;
      if (typeof event.id !== "string" || !remember(event.id)) return;
      invalidateFor(event.type);
    };

    let socket: Socket | null = null;
    try {
      socket = io(url, {
        path: "/notoai-socket/",
        withCredentials: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 5000,
      });
      const current = socket;
      current.on("connect", () => {
        current.emit("subscribe", wid, () => undefined);
      });
      current.on("reconnect", () => {
        current.emit("subscribe", wid, () => undefined);
        invalidateAll();
      });
      current.on("domain", onDomain);
      current.on("connect_error", () => {
        // Polling in each surface covers delivery; stay quiet.
      });
    } catch {
      // No socket available; polling covers delivery.
      return undefined;
    }

    return () => {
      if (socket) {
        socket.off("domain", onDomain);
        socket.off("reconnect");
        socket.off("connect");
        socket.off("connect_error");
        socket.emit("unsubscribe", wid);
        socket.disconnect();
        socket = null;
      }
      seenRef.current = new Set();
    };
  }, [wid, userId, dispatch]);
}
