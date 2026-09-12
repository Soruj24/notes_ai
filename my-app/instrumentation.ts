/** Boot the Socket.IO sidecar alongside Next (dev and `next start`). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SOCKET_ENABLED !== "0") {
    const { startSocketServer, getSocketPort } = await import(
      "@/src/lib/realtime/server"
    );
    startSocketServer();
    console.log(`[notoai] socket server on :${getSocketPort()}`);
  }
}
