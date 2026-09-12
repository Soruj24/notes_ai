import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";
import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  type SecurityEventType,
  type SecuritySeverity,
} from "@/src/lib/db/admin-enums";

/**
 * Security-relevant event stream (logins, failures, revocations, denials).
 * Written by auth/API paths; read by the security console. `metadata` must
 * never carry secrets — recordSecurityEvent sanitizes defensively and
 * CRITICAL events fan out to staff notifications (sanitized identifiers
 * only: type, email, IP — never credentials or tokens).
 */
export interface SecurityEventDoc {
  type: SecurityEventType;
  userId?: Types.ObjectId;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: SecuritySeverity;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type SecurityEventDocument = HydratedDocument<SecurityEventDoc>;

const securityEventSchema = new Schema<SecurityEventDoc>(
  {
    type: {
      type: String,
      enum: [...SECURITY_EVENT_TYPES],
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    ipAddress: { type: String, trim: true, maxlength: 64, index: true },
    userAgent: { type: String, trim: true, maxlength: 512 },
    severity: {
      type: String,
      enum: [...SECURITY_SEVERITIES],
      default: "MEDIUM",
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, versionKey: false },
);

securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });

applyJsonTransform(securityEventSchema);

export const SecurityEvent =
  models.SecurityEvent ??
  model<SecurityEventDoc>("SecurityEvent", securityEventSchema);
