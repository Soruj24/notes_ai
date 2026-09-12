import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

/**
 * Named platform role definitions. Built-in roles (SUPER_ADMIN, ADMIN,
 * MODERATOR, SUPPORT, ANALYST) resolve their grants from code
 * (`src/lib/rbac/roles.ts:ROLE_PERMISSIONS`); rows here with isSystem
 * mirror them for UI display. Custom (non-system) rows grant additional
 * named roles whose `permissions` array is authoritative.
 */
export interface AdminRoleDoc {
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminRoleDocument = HydratedDocument<AdminRoleDoc>;

const adminRoleSchema = new Schema<AdminRoleDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
      match: /^[A-Z][A-Z0-9_]*$/,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

applyJsonTransform(adminRoleSchema);

export const AdminRole =
  models.AdminRole ?? model<AdminRoleDoc>("AdminRole", adminRoleSchema);
