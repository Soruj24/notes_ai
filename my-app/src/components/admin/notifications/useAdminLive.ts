"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

function socketUrl(): string | null {
  if (process.env.SOCKET_ENABLED === "0") return null;
  if (typeof window === "undefined") return null;
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
}

/**
 * Live admin inbox feed. Staff sockets join `admin:console` at handshake
 * (role verified server-side); `admin-notification` events are refetch
 * hints — the list always reloads for truth. Silent when sockets are off.
 */
export function useAdminLive(onEvent: () => void): { connected: boolean } {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = socketUrl();
    if (!url) return;
    let socket: Socket | null = null;
    try {
      socket = io(url, {
        path: "/notoai-socket/",
        withCredentials: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        timeout: 5000,
      });
      const current = socket;
      const handle: (payload: unknown) => void = () => onEvent();
      current.on("connect", () => setConnected(true));
      current.on("disconnect", () => setConnected(false));
      current.on("admin-notification", handle);
      current.on("connect_error", () => undefined);
    } catch {
      return undefined;
    }
    return () => {
      if (socket) {
        socket.off("admin-notification");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.disconnect();
        socket = null;
      }
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected };
}
