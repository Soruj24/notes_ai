/**
 * Product feature catalog. These keys are stable API — never rename a key;
 * add new ones instead. Defaults apply on first evaluation (seed-if-missing
 * preserves operator state afterwards).
 *
 * Backend enforcement map (not only frontend hiding):
 * notes/tasks/calendar/projects/goals → domain services (all entry fns)
 * ai.assistant → ai/command route (+ ai.enabled kill switch)
 * semantic.search → semantic.service + embeddings route
 * analytics → analytics + insights services
 * templates → template.service
 * notifications → notification routes
 * realtime.sync → socket workspace subscriptions
 * voice.input → reserved (no voice pipeline exists yet; default off)
 */

export interface CatalogFlag {
  key: string;
  name: string;
  description: string;
  group: string;
  enabledByDefault: boolean;
}

export const FEATURE_CATALOG: CatalogFlag[] = [
  { key: "notes", name: "Notes", description: "Note lists, editor, trash, and search.", group: "Productivity", enabledByDefault: true },
  { key: "tasks", name: "Tasks", description: "Task lists, subtasks, completion, and planner input.", group: "Productivity", enabledByDefault: true },
  { key: "calendar", name: "Calendar", description: "Calendar events, schedule, and reminders display.", group: "Productivity", enabledByDefault: true },
  { key: "projects", name: "Projects", description: "Project boards, progress, and linking.", group: "Productivity", enabledByDefault: true },
  { key: "goals", name: "Goals", description: "Goals, milestones, and progress tracking.", group: "Productivity", enabledByDefault: true },
  { key: "ai.assistant", name: "AI Assistant", description: "Command agent, chat, and note intelligence.", group: "Intelligence", enabledByDefault: true },
  { key: "semantic.search", name: "Semantic Search", description: "Vector search and embedding indexing.", group: "Intelligence", enabledByDefault: true },
  { key: "analytics", name: "Analytics", description: "Productivity analytics and insights.", group: "Intelligence", enabledByDefault: true },
  { key: "templates", name: "Templates", description: "Template library, duplication, and instantiation.", group: "Engagement", enabledByDefault: true },
  { key: "notifications", name: "Notifications", description: "Notification inbox and unread badges.", group: "Engagement", enabledByDefault: true },
  { key: "realtime.sync", name: "Real-time Sync", description: "Live workspace updates over sockets.", group: "Engagement", enabledByDefault: true },
  { key: "voice.input", name: "Voice Input", description: "Reserved voice capture pipeline (not implemented).", group: "Engagement", enabledByDefault: false },
];

export const FEATURE_KEYS = FEATURE_CATALOG.map((f) => f.key);

export function isFeatureKey(value: unknown): value is string {
  return typeof value === "string" && FEATURE_KEYS.includes(value);
}
