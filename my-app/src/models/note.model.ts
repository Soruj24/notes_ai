import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

export interface NoteDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  body?: string;
  tags: Types.ObjectId[];
  projectId?: Types.ObjectId;
  goalId?: Types.ObjectId;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<NoteDoc>;

const noteSchema = new Schema<NoteDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, maxlength: 200000 },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    isPinned: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

noteSchema.index({ workspaceId: 1, updatedAt: -1 });
noteSchema.index({ workspaceId: 1, projectId: 1 });
noteSchema.index({ workspaceId: 1, isArchived: 1, updatedAt: -1 });
noteSchema.index({ workspaceId: 1, isFavorite: 1, updatedAt: -1 });
noteSchema.index({ workspaceId: 1, isDeleted: 1, updatedAt: -1 });
noteSchema.index({ title: "text", body: "text" });
// Platform-wide creation-volume aggregations.
noteSchema.index({ createdAt: -1 });
applyJsonTransform(noteSchema);

export const Note = models.Note ?? model<NoteDoc>("Note", noteSchema);
