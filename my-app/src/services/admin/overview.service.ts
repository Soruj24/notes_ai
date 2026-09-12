import { pingDb } from "@/src/lib/db/connection";
import { countUsers } from "@/src/repositories/user.repository";
import { countAllWorkspaces } from "@/src/repositories/workspace.repository";

/**
 * Console overview data: platform counts + dependency health.
 * Read-only and side-effect free; safe to call on every overview visit.
 */

export type HealthStatus = "ok" | "degraded" | "down" | "disabled";

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  detail?: string;
}

export interface OverviewData {
  counts: { users: number; workspaces: number };
  health: HealthCheck[];
}

async function checkOllama(): Promise<HealthCheck> {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  let origin: string;
  try {
    const url = new URL(base);
    origin = url.origin;
  } catch {
    return { name: "AI provider (Ollama)", status: "down", detail: "Invalid OLLAMA_BASE_URL." };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${origin}/api/tags`, { signal: controller.signal });
    if (!res.ok) return { name: "AI provider (Ollama)", status: "down", detail: `HTTP ${res.status}.` };
    const json = (await res.json()) as { models?: Array<{ name?: string }> };
    const n = json.models?.length ?? 0;
    return {
      name: "AI provider (Ollama)",
      status: "ok",
      detail: `${n} model${n === 1 ? "" : "s"} available. Embeddings: ${process.env.EMBEDDING_PROVIDER || "hash"}.`,
    };
  } catch {
    return { name: "AI provider (Ollama)", status: "down", detail: "Unreachable." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOverview(): Promise<OverviewData> {
  const [users, workspaces, db, ollama] = await Promise.all([
    countUsers().catch(() => -1),
    countAllWorkspaces().catch(() => -1),
    pingDb()
      .then(() => ({ name: "Database (MongoDB)", status: "ok" }) as HealthCheck)
      .catch(() => ({ name: "Database (MongoDB)", status: "down" }) as HealthCheck),
    checkOllama(),
  ]);

  const socketEnabled = process.env.SOCKET_ENABLED !== "0";
  const health: HealthCheck[] = [
    db,
    ollama,
    socketEnabled
      ? {
          name: "Realtime (Socket.IO)",
          status: "ok",
          detail: `Port ${process.env.SOCKET_PORT || "3001"}.`,
        }
      : { name: "Realtime (Socket.IO)", status: "disabled", detail: "SOCKET_ENABLED=0." },
    process.env.CRON_SECRET
      ? { name: "Reminder cron", status: "ok", detail: "CRON_SECRET configured." }
      : { name: "Reminder cron", status: "degraded", detail: "CRON_SECRET missing (dev fallback active)." },
  ];

  return { counts: { users, workspaces }, health };
}
