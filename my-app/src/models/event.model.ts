import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { EVENT_STATUSES, RECURRENCES, applyJsonTransform, type EventStatus, type Recurrence } from "@/src/lib/db";

export interface EventDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  recurrence: Recurrence;
  /** Every N units (custom schedules). */
  recurrenceInterval: number;
  /** 0=Sun..6=Sat, weekly custom schedules. */
  recurrenceWeekdays: number[];
  recurrenceUntil?: Date;
  location?: string;
  projectId?: Types.ObjectId;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<EventDoc>;

const eventSchema = new Schema<EventDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 10000 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    recurrence: { type: String, enum: RECURRENCES, default: "none", required: true },
    recurrenceInterval: { type: Number, default: 1, min: 1, max: 99, required: true },
    recurrenceWeekdays: { type: [Number], default: [] },
    recurrenceUntil: { type: Date },
    location: { type: String, trim: true, maxlength: 300 },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    status: { type: String, enum: EVENT_STATUSES, default: "confirmed", required: true },
  },
  { timestamps: true },
);

eventSchema.index({ workspaceId: 1, startsAt: 1 });
eventSchema.index({ workspaceId: 1, status: 1, startsAt: 1 });
// Platform-wide creation-volume aggregations.
eventSchema.index({ createdAt: -1 });
applyJsonTransform(eventSchema);

export const CalEvent =
  models.CalEvent ?? model<EventDoc>("CalEvent", eventSchema, "events");
