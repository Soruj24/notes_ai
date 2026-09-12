import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES, applyJsonTransform, type NotificationStatus, type NotificationType } from "@/src/lib/db";

export interface NotificationDoc {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  status: NotificationStatus;
  readAt?: Date;
  linkHref?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<NotificationDoc>;

const notificationSchema = new Schema<NotificationDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "system", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "unread", required: true },
    readAt: { type: Date },
    linkHref: { type: String, trim: true, maxlength: 512 },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
applyJsonTransform(notificationSchema);

export const Notification =
  models.Notification ?? model<NotificationDoc>("Notification", notificationSchema);
