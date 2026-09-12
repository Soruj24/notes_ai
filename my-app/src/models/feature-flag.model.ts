import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";
import {
  FEATURE_FLAG_ENVS,
  type FeatureFlagEnv,
} from "@/src/lib/db/admin-enums";

/**
 * Feature flags. Evaluation precedence (service layer):
 * environment mismatch ⇒ off; `enabled` false ⇒ off; empty targeting ⇒
 * on for everyone; explicit user/role targets restrict to those audiences
 * (rollout ignored); otherwise the deterministic rollout hash decides.
 * `rolloutPercentage` is deterministic per user id (no sticky store).
 */
export interface FeatureFlagDoc {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string[];
  targetUsers: Types.ObjectId[];
  environment: FeatureFlagEnv;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureFlagDocument = HydratedDocument<FeatureFlagDoc>;

const featureFlagSchema = new Schema<FeatureFlagDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
      match: /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$/,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    enabled: { type: Boolean, default: true, index: true },
    rolloutPercentage: { type: Number, default: 100, min: 0, max: 100 },
    targetRoles: { type: [String], default: [] },
    targetUsers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    environment: {
      type: String,
      enum: [...FEATURE_FLAG_ENVS],
      default: "all",
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

applyJsonTransform(featureFlagSchema);

export const FeatureFlag =
  models.FeatureFlag ?? model<FeatureFlagDoc>("FeatureFlag", featureFlagSchema);
