import { SystemAnnouncement } from "@/src/models/system-announcement.model";
import { clampLimit, db, oid } from "@/src/repositories/base";
import { NotFoundError } from "@/src/lib/db/errors";
import type { AnnouncementStatus } from "@/src/lib/db/admin-enums";

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  createdBy?: string;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(doc: any): AnnouncementRecord {
  return {
    id: String(doc._id),
    title: doc.title as string,
    body: doc.body as string,
    status: doc.status as AnnouncementStatus,
    createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
    publishedAt: doc.publishedAt as Date | undefined,
    expiresAt: doc.expiresAt as Date | undefined,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  createdBy?: string;
  expiresAt?: Date;
}): Promise<AnnouncementRecord> {
  await db();
  const doc = await SystemAnnouncement.create({ ...input, status: "draft" });
  return toRecord(doc.toObject());
}

export async function listAnnouncements(status?: AnnouncementStatus): Promise<AnnouncementRecord[]> {
  await db();
  const docs = await SystemAnnouncement.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(clampLimit(undefined, 100, 200))
    .lean();
  return docs.map(toRecord);
}

export async function updateAnnouncement(
  id: string,
  patch: { title?: string; body?: string; status?: AnnouncementStatus; expiresAt?: Date | null },
): Promise<AnnouncementRecord> {
  await db();
  // Publishing stamps publishedAt; drafts keep whatever was set before.
  const update: Record<string, unknown> = { ...patch };
  const doc = await SystemAnnouncement.findOneAndUpdate(
    { _id: oid(id) },
    {
      $set: {
        ...update,
        ...(patch.status === "active" ? { publishedAt: new Date() } : {}),
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!doc) throw new NotFoundError("Announcement not found.");
  return toRecord(doc);
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  await db();
  const res = await SystemAnnouncement.deleteOne({ _id: oid(id) });
  return res.deletedCount > 0;
}
