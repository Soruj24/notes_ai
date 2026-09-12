import type { SecurityEventType, SecuritySeverity } from "@/src/lib/db/admin-enums";
import { sanitizeMetadata } from "@/src/lib/security/sanitize";
import {
  countRecentLoginFailures,
  recordSecurityEvent,
} from "@/src/repositories/security-event.repository";

/**
 * Security event pipeline: sanitize → record → fan out criticals.
 * All writers go through logSecurityEvent so metadata can never carry
 * secrets and CRITICAL events always notify staff (deduplicated hourly).
 */

const DEFAULT_SEVERITY: Record<SecurityEventType, SecuritySeverity> = {
  "login.succeeded": "LOW",
  "login.failed": "MEDIUM",
  "password.changed": "MEDIUM",
  "session.revoked": "LOW",
  "session.rejected": "MEDIUM",
  "permission.denied": "MEDIUM",
  "rate.limited": "MEDIUM",
  "suspicious.activity": "HIGH",
};

/** Brute-force tripwire: failures per identity/IP inside the window. */
export const BRUTE_FORCE_THRESHOLD = 5;
export const BRUTE_FORCE_WINDOW_MIN = 15;

export interface SecurityEventInput {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: SecuritySeverity;
  metadata?: Record<string, unknown>;
}

export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  const severity = input.severity ?? DEFAULT_SEVERITY[input.type];
  const metadata = sanitizeMetadata(input.metadata);
  try {
    await recordSecurityEvent({
      type: input.type,
      userId: input.userId,
      email: input.email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      severity,
      metadata,
    });
  } catch {
    // Event stream is observability, not the request path — never fail it.
    return;
  }
  if (severity === "CRITICAL") {
    await notifyCritical(input.type, input.email, input.ipAddress).catch(() => undefined);
  }
}

/**
 * Staff inbox fan-out for critical events. Identifiers only (type, email,
 * IP) — notification bodies never carry credentials, tokens, or metadata
 * blobs. Deduplicated per title within the hour to avoid alert storms.
 */
async function notifyCritical(type: string, email?: string, ipAddress?: string): Promise<void> {
  const { notifyAdmin } = await import("@/src/services/admin-notifications.service");
  const subject = [email, ipAddress].filter(Boolean).join(" · ") || "unknown source";
  await notifyAdmin({
    title: `Critical security event: ${type} (${subject})`,
    body: `A critical ${type} event was recorded for ${subject}. Review it in Security → Events.`,
    severity: "critical",
    priority: "urgent",
    source: "security",
    linkHref: "/admin/security",
    dedupeMin: 60,
  });
}

/** Recent failure count for one identity (brute-force detector input). */
export async function countRecentFailures(email: string, since: Date): Promise<number> {
  return countRecentLoginFailures(email, since);
}
