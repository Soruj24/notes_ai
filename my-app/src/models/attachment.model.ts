import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { ATTACHMENT_ENTITIES, applyJsonTransform, type AttachmentEntity } from "@/src/lib/db";

/** Hard ceiling: the admin setting (≤100 MB) enforces below this. */
const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export interface AttachmentDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  filename: string;
  mime: string;
  size: number;
  storageKey: string;
  url?: string;
  entityType: AttachmentEntity;
  entityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AttachmentDocument = HydratedDocument<AttachmentDoc>;

const attachmentSchema = new Schema<AttachmentDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    mime: { type: String, required: true, trim: true, maxlength: 128 },
    size: { type: Number, required: true, min: 0, max: MAX_ATTACHMENT_BYTES },
    storageKey: { type: String, required: true, unique: true, trim: true, maxlength: 512 },
    url: { type: String, trim: true, maxlength: 2048 },
    entityType: { type: String, enum: ATTACHMENT_ENTITIES, default: "other", required: true },
    entityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

attachmentSchema.index({ workspaceId: 1, entityId: 1 });
attachmentSchema.index({ storageKey: 1 }, { unique: true });
applyJsonTransform(attachmentSchema);

export const Attachment =
  models.Attachment ?? model<AttachmentDoc>("Attachment", attachmentSchema);
