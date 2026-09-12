import { mergeSchedule } from "@/src/lib/scheduling/items";
import type { DateRange, ScheduleItem } from "@/src/lib/scheduling/types";
import { listUserEvents } from "@/src/services/event.service";
import { createUserReminder } from "@/src/services/reminder.service";
import { listUserTasks } from "@/src/services/task.service";

export interface ScheduleResult {
  items: ScheduleItem[];
  counts: { events: number; tasks: number };
}

/**
 * Combined schedule for a range: expanded recurring events + actionable
 * tasks (single source: mergeSchedule — views never merge manually).
 */
export async function getSchedule(
  userId: string,
  workspaceId: string,
  range: DateRange,
): Promise<ScheduleResult> {
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const lookaheadDays = await getSettingValue("calendar.scheduleLookaheadDays", 90);
  const horizon = new Date(Date.now() + lookaheadDays * 86_400_000);
  const clamped: DateRange = {
    ...range,
    to: range.to.getTime() > horizon.getTime() ? horizon : range.to,
  };
  const [events, tasks] = await Promise.all([
    listUserEvents(userId, workspaceId, {
      from: range.from,
      // Fetch a superset: recurring series may start before the range.
      limit: 500,
    }),
    listUserTasks(userId, workspaceId, { limit: 500 }),
  ]);
  const items = mergeSchedule(events, tasks, clamped);
  return {
    items,
    counts: {
      events: items.filter((i) => i.kind === "event").length,
      tasks: items.filter((i) => i.kind === "task").length,
    },
  };
}

/** Create an event plus an optional linked reminder (minutes before start). */
export async function createEventWithReminder(input: {
  userId: string;
  workspaceId: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  recurrenceUntil?: Date;
  location?: string;
  projectId?: string;
  reminderMinutesBefore?: number;
}) {
  const { createUserEvent } = await import("@/src/services/event.service");
  const { reminderMinutesBefore, ...eventInput } = input;
  const event = await createUserEvent(eventInput);
  if (reminderMinutesBefore !== undefined) {
    const remindAt = new Date(
      input.startsAt.getTime() - reminderMinutesBefore * 60000,
    );
    await createUserReminder({
      userId: input.userId,
      workspaceId: input.workspaceId,
      title: input.title,
      remindAt,
      eventId: event.id,
    });
  }
  return event;
}
