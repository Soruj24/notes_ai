import { requireWorkspace } from "@/src/lib/workspace";
import { listUserProjects } from "@/src/services/project.service";
import type { CalendarView } from "@/src/lib/scheduling/types";

/** Server helper shared by calendar/schedule pages. */
export async function getCalendarContext(loginNext: string) {
  const { user, workspace } = await requireWorkspace(loginNext);
  const projects = await listUserProjects(user.id, workspace.id);
  return {
    wid: workspace.id,
    projects: projects.map((p) => ({ id: p.id, label: p.name })),
  };
}

export function parseViewDate(
  params: Record<string, string | string[] | undefined>,
): string {
  const raw = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export type { CalendarView };
