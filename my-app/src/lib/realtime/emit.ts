import { io as socketIOClient } from "socket.io-client";
import { getSocketPort } from "@/src/lib/realtime/server";

/**
 * Emit to a user's room from anywhere (API routes, workers).
 * Fire-and-forget: a missing socket server never fails the request —
 * RTK polling covers delivery in that case.
 */

function internalUrl(): string {
  return (
    process.env.SOCKET_INTERNAL_URL ?? `http://127.0.0.1:${getSocketPort()}`
  );
}

export function emitToUser(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): void {
  if (process.env.SOCKET_ENABLED === "0") return;
  emitToRoom(`user:${userId}`, event, data);
}

/** Emit to a workspace room (domain events). */
export function emitToWorkspace(
  workspaceId: string,
  event: string,
  data: unknown,
): void {
  emitToRoom(`ws:${workspaceId}`, event, data);
}

/**
 * Emit to all open admin consoles. Staff sockets join `admin:console` at
 * handshake (role verified from the DB); clients treat events as
 * invalidation hints and refetch for truth.
 */
export function emitToAdmins(event: string, data: unknown): void {
  emitToRoom("admin:console", event, data);
}

function emitToRoom(room: string, event: string, data: unknown): void {
  if (process.env.SOCKET_ENABLED === "0") return;
  let socket: ReturnType<typeof socketIOClient> | null = null;
  const done = () => {
    try {
      socket?.close();
    } catch {
      // Ignore close errors.
    }
  };
  try {
    socket = socketIOClient(internalUrl(), {
      path: "/notoai-socket/",
      reconnection: false,
      timeout: 3000,
      auth: {
        secret: process.env.SOCKET_EMIT_SECRET ?? "dev-emit-secret",
      },
    });
    socket.on("connect", () => {
      // Acked emit: only close once the server confirms receipt.
      socket?.emit("notify", { room, event, data }, () => done());
      setTimeout(done, 4000).unref?.();
    });
    socket.on("connect_error", (err) => {
      console.warn(`[notoai] socket emit connect_error: ${err.message}`);
      done();
    });
  } catch (err) {
    // Socket unavailable: polling covers it.
    console.warn(`[notoai] socket emit failed: ${err instanceof Error ? err.message : err}`);
    done();
  }
}
