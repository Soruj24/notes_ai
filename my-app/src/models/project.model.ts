import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { PROJECT_STATUSES, applyJsonTransform, type ProjectStatus } from "@/src/lib/db";

export interface ProjectDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  dueAt?: Date;
  /** Parent goal (Goal → Project → Tasks hierarchy). */
  goalId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectDocument = HydratedDocument<ProjectDoc>;

const projectSchema = new Schema<ProjectDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: PROJECT_STATUSES, default: "active", required: true },
    color: { type: String, trim: true, maxlength: 16 },
    dueAt: { type: Date },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
  },
  { timestamps: true },
);

projectSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
projectSchema.index({ workspaceId: 1, goalId: 1 });
applyJsonTransform(projectSchema);

export const Project =
  models.Project ?? model<ProjectDoc>("Project", projectSchema);
