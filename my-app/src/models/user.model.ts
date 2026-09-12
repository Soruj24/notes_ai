import { Schema, model, models, type HydratedDocument } from "mongoose";
import { USER_STATUSES } from "@/src/lib/db/admin-enums";
import { PLATFORM_ROLES } from "@/src/lib/rbac/roles";

export interface UserDoc {
  name: string;
  email: string;
  passwordHash: string;
  /**
   * Platform role for the Admin Control Center. Absent = regular user with
   * zero platform permissions (least privilege). Orthogonal to workspace
   * membership roles. Read fresh from the DB on every admin request —
   * never embedded in the session token.
   */
  role?: string;
  /**
   * Account lifecycle: only ACTIVE authenticates. SUSPENDED/BANNED/DELETED
   * are rejected by getSessionUser() (instant lockout, sessions expire
   * naturally; per-device immediacy via explicit session revoke).
   */
  status: string;
  /** Denormalized convenience flag, kept in sync with `role` by setUserPlatformRole(). */
  isAdmin: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserDoc>;

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 64 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [...PLATFORM_ROLES],
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: [...USER_STATUSES],
      default: "ACTIVE",
      index: true,
    },
    isAdmin: { type: Boolean, default: false, index: true },
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date },
    suspendedAt: { type: Date },
    suspensionReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// Cross-account date aggregations (user growth dashboards).
userSchema.index({ createdAt: -1 });

// Custom toJSON: normalize ids like other models, never leak the hash,
// and keep the admin-internal suspension reason out of payloads.
userSchema.set("toJSON", {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.passwordHash;
    delete r.suspensionReason;
    return r;
  },
});

export const User = models.User ?? model<UserDoc>("User", userSchema);
