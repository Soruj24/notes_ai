import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { GOAL_FREQUENCIES, GOAL_STATUSES, applyJsonTransform, type GoalFrequency, type GoalStatus } from "@/src/lib/db";

export interface MilestoneDoc {
  _id: Types.ObjectId;
  title: string;
  done: boolean;
  completedAt?: Date;
  targetDate?: Date;
}

const milestoneSchema = new Schema<MilestoneDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false, required: true },
    completedAt: { type: Date },
    targetDate: { type: Date },
  },
  { _id: true },
);

export interface GoalDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description?: string;
  status: GoalStatus;
  frequency: GoalFrequency;
  targetDate?: Date;
  /**
   * Manual progress fallback (0–100). Used only when the goal has no
   * linked work to compute from — never stored redundantly alongside it.
   */
  progress: number;
  milestones: MilestoneDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export type GoalDocument = HydratedDocument<GoalDoc>;

const goalSchema = new Schema<GoalDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: GOAL_STATUSES, default: "active", required: true },
    frequency: { type: String, enum: GOAL_FREQUENCIES, default: "monthly", required: true },
    targetDate: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100, required: true },
    milestones: { type: [milestoneSchema], default: [] },
  },
  { timestamps: true },
);

goalSchema.index({ workspaceId: 1, status: 1, targetDate: 1 });
applyJsonTransform(goalSchema);

export const Goal = models.Goal ?? model<GoalDoc>("Goal", goalSchema);
