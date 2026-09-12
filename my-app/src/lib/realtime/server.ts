import { Server as SocketServer } from "socket.io";
import { verifySessionToken } from "@/src/lib/auth/tokens";
import { SESSION_COOKIE } from "@/src/lib/auth/constants";

/**
 * Standalone Socket.IO server. Booted from instrumentation.ts on SOCKET_PORT
 * (no custom Next server needed). Production may point SOCKET_INTERNAL_URL
 * at an external instance instead — emitters don't care either way.
 *
 * Security model:
 * - Handshake: the browser sends cookies automatically (withCredentials);
 *   the session cookie is signature-verified before the connection is kept.
 * - Rooms: `user:{id}` (self), `ws:{workspaceId}` (membership-verified),
 *   and `admin:console` (platform role verified from the DB per handshake).
 * - Internal `notify` relay requires SOCKET_EMIT_SECRET when configured.
 */

const DEFAULT_PORT = 3001;

declare global {
  var __notoaiSocket: SocketServer | undefined;
}

export function getSocketPort(): number {
  const raw = Number(process.env.SOCKET_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PORT;
}

function readSessionToken(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const part = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!part) return undefined;
  try {
    return decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
  } catch {
    return part.slice(SESSION_COOKIE.length + 1);
  }
}

export function startSocketServer(): SocketServer {
  if (globalThis.__notoaiSocket) return globalThis.__notoaiSocket;
  const io = new SocketServer(getSocketPort(), {
    cors: { origin: true, credentials: true },
    path: "/notoai-socket/",
  });

  // Authenticated handshake: session cookie for browsers, emit secret
  // for internal emitters (cron/services). Anonymous sockets are rejected.
  // Default internal secret is dev-only: set SOCKET_EMIT_SECRET in production.
  const internalSecret = process.env.SOCKET_EMIT_SECRET ?? "dev-emit-secret";
  io.use(async (socket, next) => {
    try {
      const presented = (socket.handshake.auth as Record<string, unknown> | undefined)?.secret;
      if (presented === internalSecret) {
        socket.data.internal = true;
        next();
        return;
      }
      const secret = process.env.AUTH_SECRET ?? "";
      const token = readSessionToken(socket.handshake.headers.cookie);
      if (!token || !secret) {
        next(new Error("unauthorized"));
        return;
      }
      const payload = await verifySessionToken(token, secret);
      if (!payload) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    // Staff consoles: role read fresh per handshake (never trusted input).
    void (async () => {
      try {
        if (socket.data.internal) return;
        const { findUserById } = await import("@/src/repositories/user.repository");
        const user = await findUserById(userId).catch(() => null);
        if (user?.role) await socket.join("admin:console");
      } catch {
        // Non-staff sockets simply miss the admin room.
      }
    })();

    socket.on("subscribe", async (workspaceId: unknown, ack?: (ok: boolean) => void) => {
      if (typeof workspaceId !== "string" || !workspaceId) {
        ack?.(false);
        return;
      }
      try {
        const { isFeatureEnabled } = await import("@/src/lib/features/evaluation");
        if (!(await isFeatureEnabled("realtime.sync", { userId }))) {
          ack?.(false);
          return;
        }
        const { requireMembership } = await import("@/src/repositories/base");
        await requireMembership(userId, workspaceId);
        await socket.join(`ws:${workspaceId}`);
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on("unsubscribe", (workspaceId: unknown) => {
      if (typeof workspaceId === "string" && workspaceId) {
        void socket.leave(`ws:${workspaceId}`);
      }
    });

    // Internal emitters only (services, cron): browsers never hold the secret.
    socket.on(
      "notify",
      (
        payload: unknown,
        ack?: (received: boolean) => void,
      ) => {
        if (!socket.data.internal) {
          ack?.(false);
          return;
        }
        const msg = payload as {
          room?: unknown;
          event?: unknown;
          data?: unknown;
        };
        if (typeof msg.room === "string" && typeof msg.event === "string") {
          io.to(msg.room).emit(msg.event, msg.data);
          ack?.(true);
        } else {
          ack?.(false);
        }
      },
    );
  });
  globalThis.__notoaiSocket = io;
  return io;
}
