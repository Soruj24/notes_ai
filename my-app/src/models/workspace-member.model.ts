import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { MEMBER_ROLES, applyJsonTransform, type MemberRole } from "@/src/lib/db";

export interface WorkspaceMemberDoc {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceMemberDocument = HydratedDocument<WorkspaceMemberDoc>;

const memberSchema = new Schema<WorkspaceMemberDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: MEMBER_ROLES, default: "member", required: true },
  },
  { timestamps: true },
);

memberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
applyJsonTransform(memberSchema);

export const WorkspaceMember =
  models.WorkspaceMember ??
  model<WorkspaceMemberDoc>("WorkspaceMember", memberSchema);
