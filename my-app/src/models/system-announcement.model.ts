import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";
import {
  ANNOUNCEMENT_STATUSES,
  type AnnouncementStatus,
} from "@/src/lib/db/admin-enums";

/**
 * User-facing announcements authored in the console. Lifecycle:
 * draft → active (delivered once per user as a `type:"system"`
 * notification by a delivery job) → expired (manual or past `expiresAt`).
 * Delivery state lives on notifications, never here.
 */
export interface SystemAnnouncementDoc {
  title: string;
  body: string;
  status: AnnouncementStatus;
  createdBy?: Types.ObjectId;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemAnnouncementDocument = HydratedDocument<SystemAnnouncementDoc>;

const systemAnnouncementSchema = new Schema<SystemAnnouncementDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: [...ANNOUNCEMENT_STATUSES],
      default: "draft",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

systemAnnouncementSchema.index({ status: 1, createdAt: -1 });

applyJsonTransform(systemAnnouncementSchema);

export const SystemAnnouncement =
  models.SystemAnnouncement ??
  model<SystemAnnouncementDoc>(
    "SystemAnnouncement",
    systemAnnouncementSchema,
  );
