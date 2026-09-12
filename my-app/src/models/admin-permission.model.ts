import { Schema, model, models, type HydratedDocument } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

/**
 * Permission registry. The canonical catalog lives in code
 * (`src/lib/rbac/permissions.ts:PERMISSIONS`); rows here let admin UIs
 * list/describe permissions and let future custom permissions exist
 * without a deploy. Enforcement always resolves against the code catalog.
 */
export interface AdminPermissionDoc {
  key: string;
  name: string;
  description?: string;
  domain: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminPermissionDocument = HydratedDocument<AdminPermissionDoc>;

const adminPermissionSchema = new Schema<AdminPermissionDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      match: /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    domain: { type: String, required: true, trim: true, maxlength: 40, index: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

applyJsonTransform(adminPermissionSchema);

export const AdminPermission =
  models.AdminPermission ??
  model<AdminPermissionDoc>("AdminPermission", adminPermissionSchema);
