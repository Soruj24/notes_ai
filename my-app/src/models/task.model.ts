import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { PRIORITIES, RECURRENCES, TASK_STATUSES, applyJsonTransform, type Priority, type Recurrence, type TaskStatus } from "@/src/lib/db";

export interface SubtaskDoc {
  _id: Types.ObjectId;
  title: string;
  done: boolean;
  completedAt?: Date;
}

const subtaskSchema = new Schema<SubtaskDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false, required: true },
    completedAt: { type: Date },
  },
  { _id: true },
);

export interface TaskDoc {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  startAt?: Date;
  dueAt?: Date;
  /** Estimated duration in minutes. */
  durationMin?: number;
  completedAt?: Date;
  projectId?: Types.ObjectId;
  goalId?: Types.ObjectId;
  tags: Types.ObjectId[];
  subtasks: SubtaskDoc[];
  recurrence: Recurrence;
  recurrenceUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDocument = HydratedDocument<TaskDoc>;

const taskSchema = new Schema<TaskDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, maxlength: 50000 },
    status: { type: String, enum: TASK_STATUSES, default: "todo", required: true },
    priority: { type: String, enum: PRIORITIES, default: "medium", required: true },
    startAt: { type: Date },
    dueAt: { type: Date },
    durationMin: { type: Number, min: 0, max: 10080 },
    completedAt: { type: Date },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    subtasks: { type: [subtaskSchema], default: [] },
    recurrence: { type: String, enum: RECURRENCES, default: "none", required: true },
    recurrenceUntil: { type: Date },
  },
  { timestamps: true },
);

taskSchema.index({ workspaceId: 1, status: 1, dueAt: 1 });
taskSchema.index({ workspaceId: 1, projectId: 1 });
taskSchema.index({ workspaceId: 1, goalId: 1 });
taskSchema.index({ workspaceId: 1, updatedAt: -1 });
// Optimized for dependency graph + pagination at scale (100/500/1000+ tasks)
taskSchema.index({ workspaceId: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, projectId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, priority: 1 });
taskSchema.index({ workspaceId: 1, projectId: 1, updatedAt: -1 });
// Platform-wide creation/completion aggregations.
taskSchema.index({ createdAt: -1 });
taskSchema.index({ completedAt: -1 });
applyJsonTransform(taskSchema);

export const Task = models.Task ?? model<TaskDoc>("Task", taskSchema);
