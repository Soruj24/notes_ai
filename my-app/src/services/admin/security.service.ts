import type { SecuritySeverity } from "@/src/lib/db/admin-enums";
import {
  countSecurityEvents,
  getSecurityEvent,
  listSecurityEvents,
  type SecurityEventFilters,
} from "@/src/repositories/security-event.repository";
import { countAuditEvents, listAuditEvents } from "@/src/repositories/admin-audit-log.repository";
import { findUserById } from "@/src/repositories/user.repository";
import { countActiveSessions } from "@/src/repositories/session.repository";
import { countCriticalUnacked } from "@/src/repositories/admin-notification.repository";

/**
 * Security console reads. Events carry sanitized metadata only — no
 * passwords, tokens, keys, or session secrets can be present (write-time
 * guarantee), and list shapes exclude nothing sensitive by construction.
 */

const DAY_MS = 86_400_000;

export interface SecurityOverview {
  failedLogins24h: number;
  failedLogins7d: number;
  suspiciousTotal: number;
  criticalUnhandled: number;
  rateLimited24h: number;
  rateLimited7d: number;
  denied7d: number;
  sessionsRevoked7d: number;
  sessionsActive: number;
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const dayAgo = new Date(Date.now() - DAY_MS);
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const [
    failedLogins24h,
    failedLogins7d,
    suspiciousTotal,
    criticalUnhandled,
    rateLimited24h,
    rateLimited7d,
    deniedAudit,
    deniedEvents,
    sessionsRevoked7d,
    sessionsActive,
  ] = await Promise.all([
    countSecurityEvents({ type: "login.failed", since: dayAgo }),
    countSecurityEvents({ type: "login.failed", since: weekAgo }),
    countSecurityEvents({ type: "suspicious.activity" }),
    countCriticalUnacked(),
    countSecurityEvents({ type: "rate.limited", since: dayAgo }),
    countSecurityEvents({ type: "rate.limited", since: weekAgo }),
    countAuditEvents({ action: "ADMIN_ACCESS_DENIED", since: weekAgo }),
    countSecurityEvents({ type: "permission.denied", since: weekAgo }),
    countSecurityEvents({ type: "session.revoked", since: weekAgo }),
    countActiveSessions(),
  ]);
  return {
    failedLogins24h,
    failedLogins7d,
    suspiciousTotal,
    criticalUnhandled,
    rateLimited24h,
    rateLimited7d,
    denied7d: deniedAudit + deniedEvents,
    sessionsRevoked7d,
    sessionsActive,
  };
}

export interface SecurityEventView {
  id: string;
  type: string;
  email?: string;
  ipAddress?: string;
  severity: SecuritySeverity;
  createdAt: string;
}

export async function getSecurityEvents(
  filters: SecurityEventFilters,
): Promise<{ events: SecurityEventView[]; total: number }> {
  const [rows, total] = await Promise.all([
    listSecurityEvents(filters),
    countSecurityEvents(filters),
  ]);
  return {
    events: rows.map((e) => ({
      id: e.id,
      type: e.type,
      email: e.email,
      ipAddress: e.ipAddress,
      severity: e.severity,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getSecurityEventDetail(id: string) {
  const doc = await getSecurityEvent(id);
  if (!doc) return null;
  const user = doc.userId ? await findUserById(doc.userId).catch(() => null) : null;
  return {
    id: doc.id,
    type: doc.type,
    severity: doc.severity,
    email: doc.email,
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    metadata: doc.metadata ?? null,
    createdAt: doc.createdAt.toISOString(),
    user: user ? { id: user.id, name: user.name, email: user.email, status: user.status } : null,
  };
}

export interface AdminActionView {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  result: string;
  timestamp: string;
}

/** Recent privileged actions (staff-attributed audit entries). */
export async function getRecentAdminActions(limit = 10): Promise<{ actions: AdminActionView[] }> {
  const rows = await listAuditEvents({ limit: 100 });
  const staff = rows.filter((r) => r.actorRole);
  const sliced = staff.slice(0, Math.min(Math.max(limit, 1), 25));
  const actors = await Promise.all(
    [...new Set(sliced.map((r) => r.actorId))].map((id) => findUserById(id).catch(() => null)),
  );
  const names = new Map(actors.filter((a) => a).map((a) => [a!.id, a!.name]));
  return {
    actions: sliced.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorName: names.get(r.actorId) ?? "(deleted user)",
      result: "success",
      timestamp: r.timestamp.toISOString(),
    })),
  };
}
