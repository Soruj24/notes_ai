import {
  createReminder,
  deleteReminder,
  listAllDueReminders,
  listDueReminders,
  listReminders,
  markReminderSent,
  updateReminder,
  type ReminderFilters,
  type ReminderRecord,
} from "@/src/repositories/reminder.repository";
import type { Recurrence, ReminderChannel, ReminderStatus } from "@/src/lib/db/enums";
import { advanceRecurrence } from "@/src/lib/dates";
import { sendToChannels } from "@/src/lib/notifications/channels";
import { emitToUser } from "@/src/lib/realtime/emit";
import { logActivity } from "@/src/services/activity";

/** Reminder use-cases + due-scan for the dispatch worker. */
export async function listUserReminders(
  userId: string,
  workspaceId: string,
  filters?: ReminderFilters,
): Promise<ReminderRecord[]> {
  return listReminders(userId, workspaceId, filters);
}

export async function createUserReminder(input: {
  userId: string;
  workspaceId: string;
  title: string;
  remindAt: Date;
  channel?: ReminderChannel;
  taskId?: string;
  eventId?: string;
  noteId?: string;
  recurrence?: Recurrence;
  recurrenceUntil?: Date;
}): Promise<ReminderRecord> {
  const reminder = await createReminder(input);
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "created",
    entityType: "reminder",
    entityId: reminder.id,
  });
  return reminder;
}

export async function updateUserReminder(input: {
  userId: string;
  workspaceId: string;
  reminderId: string;
  title?: string;
  remindAt?: Date;
  status?: ReminderStatus;
  snoozedUntil?: Date | null;
}): Promise<ReminderRecord> {
  const reminder = await updateReminder(input);
  await logActivity({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "updated",
    entityType: "reminder",
    entityId: reminder.id,
  });
  return reminder;
}

export async function deleteUserReminder(
  userId: string,
  workspaceId: string,
  reminderId: string,
): Promise<void> {
  await deleteReminder(userId, workspaceId, reminderId);
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "deleted",
    entityType: "reminder",
    entityId: reminderId,
  });
}

/** Worker entry: scan due reminders, flip them to sent. */
export async function dispatchDueReminders(
  workspaceId: string,
  now = new Date(),
): Promise<ReminderRecord[]> {
  const due = await listDueReminders(workspaceId, now);
  const sent: ReminderRecord[] = [];
  for (const reminder of due) {
    try {
      const updated = await updateReminder({
        userId: reminder.ownerId,
        workspaceId,
        reminderId: reminder.id,
        status: "sent",
      });
      sent.push(updated);
    } catch {
      // One bad reminder (e.g. owner left the workspace) must not
      // stop the rest of the batch.
    }
  }
  return sent;
}

export interface DispatchSummary {
  scanned: number;
  sent: number;
  rolled: number;
  failed: number;
}

/**
 * Cron worker: fan out every due reminder across workspaces through the
 * channel abstraction, push a socket event, mark sent, and roll recurring
 * series forward. Dismissed/cancelled rows never fire.
 */
export async function dispatchAllDueReminders(
  now = new Date(),
): Promise<DispatchSummary> {
  const due = await listAllDueReminders(now);
  let sent = 0;
  let rolled = 0;
  let failed = 0;
  for (const reminder of due) {
    try {
      const href = reminder.taskId
        ? `/tasks/${reminder.taskId}`
        : reminder.eventId
          ? "/calendar"
          : reminder.noteId
            ? `/notes/${reminder.noteId}`
            : undefined;
      await sendToChannels({
        userId: reminder.ownerId,
        workspaceId: reminder.workspaceId,
        title: reminder.title,
        body: "Reminder",
        href,
        reminderId: reminder.id,
      });
      emitToUser(reminder.ownerId, "notification:new", {
        title: reminder.title,
        href,
        reminderId: reminder.id,
      });
      await markReminderSent(reminder.id);
      sent += 1;

      if (reminder.recurrence !== "none") {
        const nextAt = advanceRecurrence(new Date(reminder.remindAt), reminder.recurrence);
        const until = reminder.recurrenceUntil
          ? new Date(reminder.recurrenceUntil)
          : undefined;
        if (nextAt && (!until || nextAt.getTime() <= until.getTime())) {
          await createReminder({
            userId: reminder.ownerId,
            workspaceId: reminder.workspaceId,
            title: reminder.title,
            remindAt: nextAt,
            channel: reminder.channel,
            taskId: reminder.taskId,
            eventId: reminder.eventId,
            noteId: reminder.noteId,
            recurrence: reminder.recurrence,
            recurrenceUntil: reminder.recurrenceUntil,
          });
          rolled += 1;
        }
      }
    } catch {
      failed += 1;
    }
  }
  return { scanned: due.length, sent, rolled, failed };
}
