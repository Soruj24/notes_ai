/** Template DTOs (server records and API JSON both fit). */

export interface TemplateDTO {
  id: string;
  workspaceId?: string;
  ownerId: string;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export function payloadSummary(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  const count = (v: unknown): number => (Array.isArray(v) ? v.length : 0);
  const notes = count(payload.notes);
  const tasks = count(payload.tasks);
  const goals = count(payload.goals);
  if (payload.project) parts.push("project");
  if (notes) parts.push(`${notes} note${notes === 1 ? "" : "s"}`);
  if (tasks) parts.push(`${tasks} task${tasks === 1 ? "" : "s"}`);
  if (goals) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "empty template";
}
