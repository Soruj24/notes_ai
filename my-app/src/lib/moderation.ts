import type { Permission } from "@/src/lib/rbac/permissions";

/**
 * Shared moderation registry: entity metadata, lifecycle verbs, and
 * consequence copy. Framework-independent — imported by both the admin
 * service (server) and moderation UI (client).
 *
 * Lifecycle model (uniform actions, per-entity meaning):
 * - archive: reversible soft removal (notes: flag, tasks/projects: status,
 *   events: cancel, goals: abandon). Needs `<base>.moderate`.
 * - restore: return to the default live state. Needs `<base>.moderate`.
 * - delete: notes = soft trash (reversible, moderate); every other type
 *   has no trash infrastructure, so delete is a permanent hard delete
 *   needing `<base>.delete` and typed confirmation.
 * - purge: notes only — permanent hard delete of any note. Needs
 *   `notes.delete` and typed confirmation.
 *
 * Admins never edit user content — no update operation exists here.
 */

export const MOD_ENTITIES = ["notes", "tasks", "events", "projects", "goals"] as const;
export type ModEntity = (typeof MOD_ENTITIES)[number];

export const MOD_ACTIONS = ["archive", "restore", "delete", "purge"] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export type PermBase = "notes" | "tasks" | "calendar" | "projects" | "goals";

export interface ModStatusOption {
  value: string;
  label: string;
}

export interface EntityConfig {
  entity: ModEntity;
  label: string;
  singular: string;
  permBase: PermBase;
  titleField: "title" | "name";
  /** Excerpt source field (body text). Undefined = no excerpt. */
  excerptField?: string;
  /** Values for the status filter. "all" is always added by the UI. */
  statuses: ModStatusOption[];
  defaultSort: "updatedAt" | "createdAt" | "title" | "startsAt";
  /** Verb labels for actions (dialog titles, buttons, audit reading). */
  verbs: Record<ModAction, string>;
  /** Consequence copy shown in the confirmation dialog. */
  consequences: Record<ModAction, string>;
}

export const ENTITY_CONFIG: Record<ModEntity, EntityConfig> = {
  notes: {
    entity: "notes",
    label: "Notes",
    singular: "note",
    permBase: "notes",
    titleField: "title",
    excerptField: "body",
    statuses: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
      { value: "trashed", label: "Trashed" },
    ],
    defaultSort: "updatedAt",
    verbs: { archive: "Archive", restore: "Restore", delete: "Trash", purge: "Purge" },
    consequences: {
      archive: "The note is hidden from the owner's lists but kept intact. Reversible at any time.",
      restore: "Archived/trashed flags are cleared and the note returns to its owner.",
      delete: "The note moves to trash (soft-delete). The owner no longer sees it, but it can be restored.",
      purge: "PERMANENT. The note document is destroyed and cannot be recovered.",
    },
  },
  tasks: {
    entity: "tasks",
    label: "Tasks",
    singular: "task",
    permBase: "tasks",
    titleField: "title",
    excerptField: "notes",
    statuses: [
      { value: "todo", label: "Todo" },
      { value: "in_progress", label: "In progress" },
      { value: "done", label: "Done" },
      { value: "archived", label: "Archived" },
    ],
    defaultSort: "updatedAt",
    verbs: { archive: "Archive", restore: "Restore", delete: "Delete", purge: "Delete" },
    consequences: {
      archive: "The task moves to archived status. The owner keeps history but it leaves active lists.",
      restore: "The task returns to todo status.",
      delete: "PERMANENT. Tasks have no trash — the document is destroyed and cannot be recovered.",
      purge: "PERMANENT. The task document is destroyed and cannot be recovered.",
    },
  },
  events: {
    entity: "events",
    label: "Calendar",
    singular: "event",
    permBase: "calendar",
    titleField: "title",
    excerptField: "description",
    statuses: [
      { value: "confirmed", label: "Confirmed" },
      { value: "tentative", label: "Tentative" },
      { value: "cancelled", label: "Cancelled" },
    ],
    defaultSort: "startsAt",
    verbs: { archive: "Cancel", restore: "Restore", delete: "Delete", purge: "Delete" },
    consequences: {
      archive: "The event is marked cancelled. It stays visible as cancelled and stops firing reminders.",
      restore: "The event returns to confirmed status.",
      delete: "PERMANENT. Events have no trash — the document is destroyed and cannot be recovered.",
      purge: "PERMANENT. The event document is destroyed and cannot be recovered.",
    },
  },
  projects: {
    entity: "projects",
    label: "Projects",
    singular: "project",
    permBase: "projects",
    titleField: "name",
    excerptField: "description",
    statuses: [
      { value: "active", label: "Active" },
      { value: "on_hold", label: "On hold" },
      { value: "completed", label: "Completed" },
      { value: "archived", label: "Archived" },
    ],
    defaultSort: "updatedAt",
    verbs: { archive: "Archive", restore: "Restore", delete: "Delete", purge: "Delete" },
    consequences: {
      archive: "The project moves to archived status. Linked tasks keep their own state.",
      restore: "The project returns to active status.",
      delete: "PERMANENT. Projects have no trash — the document is destroyed. Linked tasks are NOT deleted.",
      purge: "PERMANENT. The project document is destroyed and cannot be recovered.",
    },
  },
  goals: {
    entity: "goals",
    label: "Goals",
    singular: "goal",
    permBase: "goals",
    titleField: "title",
    excerptField: "description",
    statuses: [
      { value: "active", label: "Active" },
      { value: "achieved", label: "Achieved" },
      { value: "abandoned", label: "Abandoned" },
    ],
    defaultSort: "updatedAt",
    verbs: { archive: "Abandon", restore: "Reactivate", delete: "Delete", purge: "Delete" },
    consequences: {
      archive: "The goal is marked abandoned. Progress history is kept and it can be reactivated.",
      restore: "The goal returns to active status.",
      delete: "PERMANENT. Goals have no trash — the document is destroyed and cannot be recovered.",
      purge: "PERMANENT. The goal document is destroyed and cannot be recovered.",
    },
  },
};

/** Actions offered per entity (purge exists only for notes). */
export function actionsFor(entity: ModEntity): ModAction[] {
  return entity === "notes" ? ["archive", "restore", "delete", "purge"] : ["archive", "restore", "delete"];
}

/** Permission guarding a lifecycle action. Reversible = moderate; irreversible = delete. */
export function permissionFor(permBase: PermBase, action: ModAction): Permission {
  if (action === "purge") return `${permBase}.delete` as Permission;
  if (action === "delete") {
    return permBase === "notes"
      ? "notes.moderate" // trash is reversible
      : (`${permBase}.delete` as Permission);
  }
  return `${permBase}.moderate` as Permission;
}

/** Canonical audit verb (SCREAMING_SNAKE, stable API). */
export function auditVerb(entity: ModEntity, action: ModAction): string {
  if (entity === "notes" && action === "delete") return "NOTE_DELETED";
  if (entity === "notes" && action === "archive") return "NOTE_ARCHIVED";
  if (entity === "notes" && action === "restore") return "NOTE_RESTORED";
  if (action === "purge") return "NOTE_PURGED";
  if (entity === "events" && action === "archive") return "EVENT_CANCELLED";
  if (entity === "events" && action === "restore") return "EVENT_RESTORED";
  if (entity === "goals" && action === "archive") return "GOAL_ABANDONED";
  if (entity === "goals" && action === "restore") return "GOAL_REACTIVATED";
  if (entity === "tasks" && action === "archive") return "TASK_ARCHIVED";
  if (entity === "tasks" && action === "restore") return "TASK_RESTORED";
  if (entity === "projects" && action === "archive") return "PROJECT_ARCHIVED";
  if (entity === "projects" && action === "restore") return "PROJECT_RESTORED";
  const subject =
    entity === "notes" ? "NOTE" : entity === "tasks" ? "TASK" : entity === "events" ? "EVENT" : entity === "projects" ? "PROJECT" : "GOAL";
  return `${subject}_DELETED`;
}

export function isModEntity(value: unknown): value is ModEntity {
  return typeof value === "string" && (MOD_ENTITIES as readonly string[]).includes(value);
}

export function isModAction(value: unknown): value is ModAction {
  return typeof value === "string" && (MOD_ACTIONS as readonly string[]).includes(value);
}
