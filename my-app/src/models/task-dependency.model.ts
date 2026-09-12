import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import {
  TASK_DEPENDENCY_TYPES,
  applyJsonTransform,
  type TaskDependencyType,
} from "@/src/lib/db";

export interface TaskDependencyDoc {
  workspaceId: Types.ObjectId;
  predecessorTaskId: Types.ObjectId;
  successorTaskId: Types.ObjectId;
  type: TaskDependencyType;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDependencyDocument = HydratedDocument<TaskDependencyDoc>;

const taskDependencySchema = new Schema<TaskDependencyDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    predecessorTaskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    successorTaskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    type: {
      type: String,
      enum: TASK_DEPENDENCY_TYPES,
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

// Self-dependency (Task A → Task A) is prevented in validation
// (src/lib/validation/dependencies.ts) and repository (assert + DB guard).
// A schema-level cross-field check would require document-aware validate;
// the service-layer guard is the single source of truth to avoid
// mongoose overload typing drift across versions.

// Unique edge per workspace: duplicate dependency prevention.
// A→B may only exist once regardless of type — adjust to include `type` if
// per-type duplicates should be allowed.
taskDependencySchema.index(
  { workspaceId: 1, predecessorTaskId: 1, successorTaskId: 1 },
  { unique: true },
);

// Query helpers — workspace isolation always first.
taskDependencySchema.index({ workspaceId: 1, successorTaskId: 1 });
taskDependencySchema.index({ workspaceId: 1, predecessorTaskId: 1 });
taskDependencySchema.index({ workspaceId: 1, type: 1 });
taskDependencySchema.index({ workspaceId: 1, createdAt: -1 });
// Covering index for graph queries (workspace + edges) — avoids collection scan at 500+ edges
taskDependencySchema.index({ workspaceId: 1, predecessorTaskId: 1, successorTaskId: 1, type: 1 });

applyJsonTransform(taskDependencySchema);

export const TaskDependency =
  models.TaskDependency ?? model<TaskDependencyDoc>("TaskDependency", taskDependencySchema);
