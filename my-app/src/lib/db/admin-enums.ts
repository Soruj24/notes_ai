/**
 * Shared enums for the Admin Control Center data layer.
 * Platform roles/permissions themselves live in `src/lib/rbac/*`;
 * these cover stored admin-domain values.
 */

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SYSTEM_SETTING_TYPES = ["string", "number", "boolean", "json"] as const;
export type SystemSettingType = (typeof SYSTEM_SETTING_TYPES)[number];

export const FEATURE_FLAG_ENVS = ["all", "development", "staging", "production"] as const;
export type FeatureFlagEnv = (typeof FEATURE_FLAG_ENVS)[number];

export const ADMIN_NOTIFICATION_SEVERITIES = ["info", "warning", "critical"] as const;
export type AdminNotificationSeverity = (typeof ADMIN_NOTIFICATION_SEVERITIES)[number];

/** Staff inbox priority (triage order). Set by producers, never by severity alone. */
export const ADMIN_NOTIFICATION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type AdminNotificationPriority = (typeof ADMIN_NOTIFICATION_PRIORITIES)[number];

/** Originating subsystem for filtering and routing. */
export const ADMIN_NOTIFICATION_SOURCES = [
  "auth",
  "security",
  "ai",
  "system",
  "features",
  "settings",
  "maintenance",
] as const;
export type AdminNotificationSource = (typeof ADMIN_NOTIFICATION_SOURCES)[number];

export const SECURITY_EVENT_TYPES = [
  "login.succeeded",
  "login.failed",
  "password.changed",
  "session.revoked",
  "session.rejected",
  "permission.denied",
  "rate.limited",
  "suspicious.activity",
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

/** Event severity for the security console. Independent from notification severities. */
export const SECURITY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

export const ANNOUNCEMENT_STATUSES = ["draft", "active", "expired"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
