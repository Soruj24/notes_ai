import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { RECURRENCES, REMINDER_CHANNELS, REMINDER_STATUSES, applyJsonTransform, type Recurrence, type ReminderChannel, type ReminderStatus } from "@/src/lib/db";

export interface ReminderDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  remindAt: Date;
  channel: ReminderChannel;
  status: ReminderStatus;
  snoozedUntil?: Date;
  taskId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  noteId?: Types.ObjectId;
  recurrence: Recurrence;
  recurrenceUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderDocument = HydratedDocument<ReminderDoc>;

const reminderSchema = new Schema<ReminderDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    remindAt: { type: Date, required: true },
    channel: { type: String, enum: REMINDER_CHANNELS, default: "in_app", required: true },
    status: { type: String, enum: REMINDER_STATUSES, default: "pending", required: true },
    snoozedUntil: { type: Date },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    eventId: { type: Schema.Types.ObjectId, ref: "CalEvent" },
    noteId: { type: Schema.Types.ObjectId, ref: "Note" },
    recurrence: { type: String, enum: RECURRENCES, default: "none", required: true },
    recurrenceUntil: { type: Date },
  },
  { timestamps: true },
);

reminderSchema.index({ workspaceId: 1, status: 1, remindAt: 1 });
reminderSchema.index({ ownerId: 1, status: 1, remindAt: 1 });
applyJsonTransform(reminderSchema);

export const Reminder =
  models.Reminder ?? model<ReminderDoc>("Reminder", reminderSchema);
