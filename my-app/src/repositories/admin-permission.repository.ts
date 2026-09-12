import { AdminPermission } from "@/src/models/admin-permission.model";
import { clampLimit, db } from "@/src/repositories/base";

export interface PermissionRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  domain: string;
  isSystem: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): PermissionRecord {
  return {
    id: String(doc._id),
    key: doc.key as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    domain: doc.domain as string,
    isSystem: Boolean(doc.isSystem),
  };
}

export async function listPermissions(domain?: string): Promise<PermissionRecord[]> {
  await db();
  const docs = await AdminPermission.find(domain ? { domain } : {})
    .sort({ domain: 1, key: 1 })
    .limit(clampLimit(undefined, 200, 500))
    .lean();
  return docs.map(toRecord);
}

/** Registry sync: inserts missing keys, never deletes or overwrites. */
export async function ensurePermissions(
  entries: Array<{ key: string; name: string; description?: string; domain: string }>,
): Promise<number> {
  await db();
  let inserted = 0;
  for (const entry of entries) {
    const res = await AdminPermission.updateOne(
      { key: entry.key },
      { $setOnInsert: { ...entry, isSystem: true } },
      { upsert: true },
    );
    if (res.upsertedCount > 0) inserted += 1;
  }
  return inserted;
}
