import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { WORKSPACE_STATUSES, applyJsonTransform, type WorkspaceStatus } from "@/src/lib/db";

export interface WorkspaceDoc {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  /**
   * Lifecycle gate for admin suspend/archive/delete. Only ACTIVE
   * authenticates member access (see requireMembership). Defaults apply
   * to new documents; older rows normalize to ACTIVE at read time.
   */
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceDocument = HydratedDocument<WorkspaceDoc>;

const workspaceSchema = new Schema<WorkspaceDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: [...WORKSPACE_STATUSES],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

workspaceSchema.index({ ownerId: 1, createdAt: -1 });
applyJsonTransform(workspaceSchema);

export const Workspace =
  models.Workspace ?? model<WorkspaceDoc>("Workspace", workspaceSchema);
