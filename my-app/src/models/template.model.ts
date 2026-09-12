import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { TEMPLATE_KINDS, applyJsonTransform, type TemplateKind } from "@/src/lib/db";

export interface TemplateDoc {
  workspaceId?: Types.ObjectId;
  ownerId: Types.ObjectId;
  kind: TemplateKind;
  title: string;
  payload: Record<string, unknown>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateDocument = HydratedDocument<TemplateDoc>;

const templateSchema = new Schema<TemplateDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: TEMPLATE_KINDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    payload: { type: Schema.Types.Mixed, required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

templateSchema.index({ workspaceId: 1, kind: 1, updatedAt: -1 });
applyJsonTransform(templateSchema);

export const Template =
  models.Template ?? model<TemplateDoc>("Template", templateSchema);
