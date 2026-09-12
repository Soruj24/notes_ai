import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES, applyJsonTransform, type ActivityAction, type ActivityEntity } from "@/src/lib/db";

export interface ActivityLogDoc {
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityLogDocument = HydratedDocument<ActivityLogDoc>;

const activitySchema = new Schema<ActivityLogDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    entityType: { type: String, enum: ACTIVITY_ENTITIES, required: true },
    entityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
// Platform-wide activity + DAU aggregations.
activitySchema.index({ createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });
applyJsonTransform(activitySchema);

export const ActivityLog =
  models.ActivityLog ?? model<ActivityLogDoc>("ActivityLog", activitySchema);
