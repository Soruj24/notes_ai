import { Schema, model, models, type HydratedDocument, type Types } from "mongoose";
import { applyJsonTransform } from "@/src/lib/db";

/**
 * Platform audit trail. Append-only, enforced three ways: the repository
 * exposes create + list only (no update/delete functions exist, and none
 * must be added); schema pre-hooks reject update/delete operations even
 * from future code; no API route mutates entries. `metadata` may carry
 * PII (before/after snapshots); list endpoints must project/redact
 * before responding.
 */
export type AuditResult = "success" | "denied";

export const AUDIT_RESULTS: readonly AuditResult[] = ["success", "denied"];

export interface AdminAuditLogDoc {
  actorId: Types.ObjectId;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  workspaceId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  /** denied = a privileged attempt the service layer refused. */
  result: AuditResult;
  timestamp: Date;
}

export type AdminAuditLogDocument = HydratedDocument<AdminAuditLogDoc>;

const adminAuditLogSchema = new Schema<AdminAuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: { type: String, trim: true, maxlength: 32 },
    action: { type: String, required: true, trim: true, maxlength: 120, index: true },
    resourceType: { type: String, trim: true, maxlength: 60 },
    resourceId: { type: String, trim: true, maxlength: 64 },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 512 },
    result: { type: String, enum: [...AUDIT_RESULTS], default: "success", index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

adminAuditLogSchema.index({ actorId: 1, timestamp: -1 });
adminAuditLogSchema.index({ resourceType: 1, resourceId: 1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ result: 1, timestamp: -1 });

// Append-only enforcement: reject every mutation path at the model layer
// so not even future repository code can alter or silently drop entries.
// A synchronous throw aborts the operation with this error.
function blockAuditMutation(this: unknown): void {
  void this;
  throw new Error("Audit log is append-only.");
}

adminAuditLogSchema.pre(/^(update|delete|findOneAnd|replace)/, blockAuditMutation);

applyJsonTransform(adminAuditLogSchema);

export const AdminAuditLog =
  models.AdminAuditLog ??
  model<AdminAuditLogDoc>("AdminAuditLog", adminAuditLogSchema);
