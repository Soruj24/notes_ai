import { FeatureFlag } from "@/src/models/feature-flag.model";
import { clampLimit, db } from "@/src/repositories/base";
import type { FeatureFlagEnv } from "@/src/lib/db/admin-enums";

export interface FlagRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string[];
  targetUsers: string[];
  environment: FeatureFlagEnv;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): FlagRecord {
  return {
    id: String(doc._id),
    key: doc.key as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    enabled: Boolean(doc.enabled),
    rolloutPercentage: Number(doc.rolloutPercentage ?? 100),
    targetRoles: (doc.targetRoles ?? []) as string[],
    targetUsers: ((doc.targetUsers ?? []) as unknown[]).map(String),
    environment: doc.environment as FeatureFlagEnv,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function getFlag(key: string): Promise<FlagRecord | null> {
  await db();
  const doc = await FeatureFlag.findOne({ key }).lean();
  return doc ? toRecord(doc) : null;
}

export async function listFlags(environment?: string): Promise<FlagRecord[]> {
  await db();
  const docs = await FeatureFlag.find(environment ? { environment } : {})
    .sort({ key: 1 })
    .limit(clampLimit(undefined, 200, 500))
    .lean();
  return docs.map(toRecord);
}

export async function upsertFlag(input: {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  targetRoles?: string[];
  targetUsers?: string[];
  environment?: FeatureFlagEnv;
  updatedBy?: string;
}): Promise<FlagRecord> {
  await db();
  const doc = await FeatureFlag.findOneAndUpdate(
    { key: input.key },
    { $set: { ...input } },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  return toRecord(doc);
}

export async function setFlagEnabled(key: string, enabled: boolean, updatedBy?: string): Promise<FlagRecord | null> {
  await db();
  const doc = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: { enabled, ...(updatedBy ? { updatedBy } : {}) } },
    { new: true },
  ).lean();
  return doc ? toRecord(doc) : null;
}
