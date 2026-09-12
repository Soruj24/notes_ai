import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

/**
 * Embedding rows: chunk text + vector + strict isolation metadata.
 * The Mongo store brute-forces cosine over workspace-filtered rows
 * (personal scale); swap the VectorStore for ANN at larger scale.
 */
export interface EmbeddingDoc {
  userId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  chunkIndex: number;
  text: string;
  vector: number[];
  createdAt: Date;
  updatedAt: Date;
}

export type EmbeddingDocument = HydratedDocument<EmbeddingDoc>;

const embeddingSchema = new Schema<EmbeddingDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    entityType: { type: String, required: true, maxlength: 32 },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    chunkIndex: { type: Number, required: true, min: 0 },
    text: { type: String, required: true, maxlength: 5000 },
    vector: { type: [Number], required: true },
  },
  { timestamps: true },
);

embeddingSchema.index({ workspaceId: 1, entityType: 1, entityId: 1 });
embeddingSchema.index({ workspaceId: 1, userId: 1, entityType: 1 });
embeddingSchema.index(
  { workspaceId: 1, entityType: 1, entityId: 1, chunkIndex: 1 },
  { unique: true },
);
applyJsonTransform(embeddingSchema);

export const Embedding =
  models.Embedding ?? model<EmbeddingDoc>("Embedding", embeddingSchema);
