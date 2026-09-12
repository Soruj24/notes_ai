import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { AI_CONVERSATION_STATUSES, applyJsonTransform, type AiConversationStatus } from "@/src/lib/db";

export interface AiConversationDoc {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  model?: string;
  status: AiConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type AiConversationDocument = HydratedDocument<AiConversationDoc>;

const conversationSchema = new Schema<AiConversationDoc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    model: { type: String, trim: true, maxlength: 100 },
    status: { type: String, enum: AI_CONVERSATION_STATUSES, default: "active", required: true },
  },
  { timestamps: true },
);

conversationSchema.index({ workspaceId: 1, userId: 1, updatedAt: -1 });
// Platform-wide AI-active-user aggregations.
conversationSchema.index({ updatedAt: -1 });
applyJsonTransform(conversationSchema);

export const AiConversation =
  models.AiConversation ??
  model<AiConversationDoc>("AiConversation", conversationSchema);
