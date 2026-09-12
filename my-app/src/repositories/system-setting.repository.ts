import { SystemSetting } from "@/src/models/system-setting.model";
import { clampLimit, db } from "@/src/repositories/base";
import type { SystemSettingType } from "@/src/lib/db/admin-enums";

/**
 * Runtime settings store. Values are uninterpreted here; per-key schema
 * validation lives at the service layer. Readers must use
 * `toSafeRecord()` â€” never serialize raw `value` for secret-bearing keys.
 */

export interface SettingRecord {
  id: string;
  key: string;
  value: unknown;
  type: SystemSettingType;
  category: string;
  description?: string;
  isPublic: boolean;
  isEditable: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SECRET_KEY_PATTERN = /secret|password|passwd|api[_-]?key|token|private/i;

/** Secret-bearing keys are write-only: value is never returned. */
export function isSecretSettingKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/** Strip `value` for secret keys. All API responses must use this shape. */
export function toSafeRecord(record: SettingRecord): Omit<SettingRecord, "value"> & { value?: unknown } {
  if (!isSecretSettingKey(record.key)) return record;
  const rest: Omit<SettingRecord, "value"> & { value?: unknown } = { ...record };
  delete rest.value;
  return rest;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): SettingRecord {
  return {
    id: String(doc._id),
    key: doc.key as string,
    value: doc.value as unknown,
    type: doc.type as SystemSettingType,
    category: doc.category as string,
    description: doc.description as string | undefined,
    isPublic: Boolean(doc.isPublic),
    isEditable: doc.isEditable !== false,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function getSetting(key: string): Promise<SettingRecord | null> {
  await db();
  const doc = await SystemSetting.findOne({ key }).lean();
  return doc ? toRecord(doc) : null;
}

export async function listSettings(category?: string): Promise<SettingRecord[]> {
  await db();
  const docs = await SystemSetting.find(category ? { category } : {})
    .sort({ category: 1, key: 1 })
    .limit(clampLimit(undefined, 200, 500))
    .lean();
  return docs.map(toRecord);
}

export async function listPublicSettings(): Promise<SettingRecord[]> {
  await db();
  const docs = await SystemSetting.find({ isPublic: true })
    .sort({ key: 1 })
    .limit(clampLimit(undefined, 200, 500))
    .lean();
  return docs.map(toRecord);
}

export async function upsertSetting(input: {
  key: string;
  value: unknown;
  type: SystemSettingType;
  category: string;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
  updatedBy?: string;
}): Promise<SettingRecord> {
  await db();
  const doc = await SystemSetting.findOneAndUpdate(
    { key: input.key },
    { $set: { ...input } },
    { new: true, upsert: true },
  ).lean();
  return toRecord(doc);
}

/** Reset a key to its default by removing the override row. */
export async function deleteSetting(key: string): Promise<boolean> {
  await db();
  const res = await SystemSetting.deleteOne({ key });
  return (res.deletedCount ?? 0) > 0;
}
