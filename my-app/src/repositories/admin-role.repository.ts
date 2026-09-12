import { AdminRole } from "@/src/models/admin-role.model";
import { ForbiddenError } from "@/src/lib/db/errors";
import { clampLimit, db, oid } from "@/src/repositories/base";

export interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): RoleRecord {
  return {
    id: String(doc._id),
    key: doc.key as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    permissions: (doc.permissions ?? []) as string[],
    isSystem: Boolean(doc.isSystem),
    createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function listRoles(): Promise<RoleRecord[]> {
  await db();
  const docs = await AdminRole.find({}).sort({ key: 1 }).limit(clampLimit(undefined, 100, 200)).lean();
  return docs.map(toRecord);
}

export async function getRoleByKey(key: string): Promise<RoleRecord | null> {
  await db();
  const doc = await AdminRole.findOne({ key: key.toUpperCase().trim() }).lean();
  return doc ? toRecord(doc) : null;
}

export async function createRole(input: {
  key: string;
  name: string;
  description?: string;
  permissions?: string[];
  createdBy?: string;
}): Promise<RoleRecord> {
  await db();
  const doc = await AdminRole.create({
    key: input.key.toUpperCase().trim(),
    name: input.name,
    description: input.description,
    permissions: input.permissions ?? [],
    isSystem: false,
    createdBy: input.createdBy,
  });
  return toRecord(doc.toObject());
}

export async function updateRolePermissions(id: string, permissions: string[]): Promise<RoleRecord | null> {
  await db();
  const doc = await AdminRole.findOneAndUpdate(
    { _id: oid(id) },
    { $set: { permissions } },
    { new: true, runValidators: true },
  ).lean();
  return doc ? toRecord(doc) : null;
}

/** System (built-in) roles are code-defined and can never be deleted. */
export async function deleteRole(id: string): Promise<boolean> {
  await db();
  const doc = await AdminRole.findById(oid(id)).lean();
  if (!doc) return false;
  if (doc.isSystem) throw new ForbiddenError("System roles cannot be deleted.");
  await AdminRole.deleteOne({ _id: doc._id });
  return true;
}
