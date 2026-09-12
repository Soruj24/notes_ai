import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

export interface TagDoc {
  workspaceId: Types.ObjectId;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TagDocument = HydratedDocument<TagDoc>;

const tagSchema = new Schema<TagDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    color: { type: String, trim: true, maxlength: 16 },
  },
  { timestamps: true },
);

tagSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
applyJsonTransform(tagSchema);

export const Tag = models.Tag ?? model<TagDoc>("Tag", tagSchema);
