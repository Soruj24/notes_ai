import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { AI_ROLES, applyJsonTransform, type AiRole } from "@/src/lib/db";

export interface AiMessageDoc {
  conversationId: Types.ObjectId;
  role: AiRole;
  content: string;
  toolName?: string;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AiMessageDocument = HydratedDocument<AiMessageDoc>;

const messageSchema = new Schema<AiMessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "AiConversation", required: true, index: true },
    role: { type: String, enum: AI_ROLES, required: true },
    content: { type: String, required: true, maxlength: 100000 },
    toolName: { type: String, trim: true, maxlength: 100 },
    inputTokens: { type: Number, min: 0 },
    outputTokens: { type: Number, min: 0 },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
// Platform-wide usage-volume aggregations.
messageSchema.index({ createdAt: -1 });
applyJsonTransform(messageSchema);

export const AiMessage =
  models.AiMessage ?? model<AiMessageDoc>("AiMessage", messageSchema);
