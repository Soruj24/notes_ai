import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";
import {
  ADMIN_NOTIFICATION_PRIORITIES,
  ADMIN_NOTIFICATION_SEVERITIES,
  ADMIN_NOTIFICATION_SOURCES,
  type AdminNotificationPriority,
  type AdminNotificationSeverity,
  type AdminNotificationSource,
} from "@/src/lib/db/admin-enums";

/**
 * Console notifications for platform staff (outages, abuse spikes, job
 * failures). `targetRole` scopes visibility (null = all platform roles);
 * `readBy` tracks acknowledgements per admin. `source` names the producing
 * subsystem; `priority` drives triage order. Bodies carry identifiers only
 * (type, email, IP) — never credentials, tokens, or metadata blobs.
 * Never sent to end users — user-facing broadcasts use `Notification` +
 * announcements.
 */
export interface AdminNotificationDoc {
  title: string;
  body: string;
  severity: AdminNotificationSeverity;
  priority: AdminNotificationPriority;
  source: AdminNotificationSource;
  targetRole?: string;
  linkHref?: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type AdminNotificationDocument = HydratedDocument<AdminNotificationDoc>;

const adminNotificationSchema = new Schema<AdminNotificationDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: {
      type: String,
      enum: [...ADMIN_NOTIFICATION_SEVERITIES],
      default: "info",
      index: true,
    },
    priority: {
      type: String,
      enum: [...ADMIN_NOTIFICATION_PRIORITIES],
      default: "normal",
      index: true,
    },
    source: {
      type: String,
      enum: [...ADMIN_NOTIFICATION_SOURCES],
      default: "system",
      index: true,
    },
    targetRole: { type: String, trim: true, maxlength: 32, index: true },
    linkHref: { type: String, trim: true, maxlength: 512 },
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ targetRole: 1, createdAt: -1 });
adminNotificationSchema.index({ severity: 1, createdAt: -1 });

applyJsonTransform(adminNotificationSchema);

export const AdminNotification =
  models.AdminNotification ??
  model<AdminNotificationDoc>("AdminNotification", adminNotificationSchema);
