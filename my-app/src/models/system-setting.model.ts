import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";
import {
  SYSTEM_SETTING_TYPES,
  type SystemSettingType,
} from "@/src/lib/db/admin-enums";

/**
 * Runtime system configuration. Values are validated per-key by a schema
 * registry at the service layer (this model stores, never interprets).
 *
 * Secrecy is enforced at read time, not by a flag: repository serializers
 * redact `value` for secret-bearing keys (names containing secret, key,
 * password, or token). Secret updates are write-only and require re-entry.
 */
export interface SystemSettingDoc {
  key: string;
  value: unknown;
  type: SystemSettingType;
  category: string;
  description?: string;
  isPublic: boolean;
  isEditable: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemSettingDocument = HydratedDocument<SystemSettingDoc>;

const systemSettingSchema = new Schema<SystemSettingDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
      match: /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/,
      index: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
    type: { type: String, enum: [...SYSTEM_SETTING_TYPES], required: true },
    category: { type: String, required: true, trim: true, maxlength: 40, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    isPublic: { type: Boolean, default: false, index: true },
    isEditable: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

applyJsonTransform(systemSettingSchema);

export const SystemSetting =
  models.SystemSetting ??
  model<SystemSettingDoc>("SystemSetting", systemSettingSchema);
