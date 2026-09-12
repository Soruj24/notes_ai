/** Shared enums for models, repositories, and services. */

export const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * Workspace lifecycle. Only ACTIVE workspaces are fully usable:
 * SUSPENDED/DELETED block all member access (enforced centrally in
 * requireMembership); ARCHIVED is read-only (enforced via
 * requireWritableMembership on mutating paths). Pre-status documents
 * normalize to ACTIVE.
 */
export const WORKSPACE_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED", "DELETED"] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done", "archived"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type GoalFrequency = (typeof GOAL_FREQUENCIES)[number];

export const RECURRENCES = ["none", "daily", "weekly", "monthly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const EVENT_STATUSES = ["confirmed", "tentative", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REMINDER_CHANNELS = ["in_app", "email", "push"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const REMINDER_STATUSES = ["pending", "sent", "dismissed", "failed", "cancelled", "snoozed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

/** Delivery channels. in_app always works; email/push activate via env. */
export const NOTIFICATION_CHANNELS = ["in_app", "email", "push"] as const;
export type NotificationChannelName = (typeof NOTIFICATION_CHANNELS)[number];

export const ATTACHMENT_ENTITIES = ["note", "task", "project", "event", "message", "other"] as const;
export type AttachmentEntity = (typeof ATTACHMENT_ENTITIES)[number];

export const NOTIFICATION_TYPES = ["reminder", "mention", "system", "ai"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["unread", "read", "archived"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const AI_ROLES = ["user", "assistant", "system", "tool"] as const;
export type AiRole = (typeof AI_ROLES)[number];

export const AI_CONVERSATION_STATUSES = ["active", "archived"] as const;
export type AiConversationStatus = (typeof AI_CONVERSATION_STATUSES)[number];

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "completed",
  "reopened",
  "moved",
  "commented",
  "shared",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITIES = [
  "note",
  "task",
  "project",
  "goal",
  "event",
  "reminder",
  "attachment",
  "workspace",
] as const;
export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];

export const TEMPLATE_KINDS = ["note", "task", "project", "plan"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TASK_DEPENDENCY_TYPES = ["blocks", "blocked_by", "related"] as const;
export type TaskDependencyType = (typeof TASK_DEPENDENCY_TYPES)[number];

/** Roles allowed to mutate documents they do not own. */
export const ELEVATED_ROLES: readonly MemberRole[] = ["owner", "admin"];

/** Roles forbidden from any mutation. */
export const READ_ONLY_ROLES: readonly MemberRole[] = ["viewer"];
