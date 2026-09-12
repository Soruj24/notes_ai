import { cosineSimilarity } from "@/src/lib/ai/embeddings";
import { connectDb } from "@/src/lib/db/connection";
import { Embedding } from "@/src/models/embedding.model";
import type {
  VectorHit,
  VectorQueryFilter,
  VectorStore,
  VectorUpsert,
} from "@/src/lib/vectors/types";

/**
 * Mongo-backed vector store with application-side cosine similarity.
 * Isolation first: the candidate set is ALWAYS filtered by workspaceId
 * (+ userId + entity types) before any vector math runs.
 */
export class MongoVectorStore implements VectorStore {
  readonly name = "mongo-brute-force";

  async upsertMany(items: VectorUpsert[]): Promise<void> {
    if (!items.length) return;
    await connectDb();
    await Embedding.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: {
            workspaceId: item.workspaceId,
            entityType: item.entityType,
            entityId: item.entityId,
            chunkIndex: item.chunkIndex,
          },
          update: { $set: { ...item } },
          upsert: true,
        },
      })),
    );
  }

  async deleteByEntity(
    workspaceId: string,
    entityType: VectorUpsert["entityType"],
    entityId: string,
  ): Promise<number> {
    await connectDb();
    const res = await Embedding.deleteMany({ workspaceId, entityType, entityId });
    return res.deletedCount;
  }

  async deleteByWorkspace(workspaceId: string): Promise<number> {
    await connectDb();
    const res = await Embedding.deleteMany({ workspaceId });
    return res.deletedCount;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    await connectDb();
    return Embedding.countDocuments({ workspaceId });
  }

  async query(
    vector: number[],
    topK: number,
    filter: VectorQueryFilter,
  ): Promise<VectorHit[]> {
    await connectDb();
    const match: Record<string, unknown> = {
      workspaceId: filter.workspaceId,
      userId: filter.userId,
    };
    if (filter.entityTypes?.length) match.entityType = { $in: filter.entityTypes };
    const candidates = await Embedding.find(match)
      .select({ text: 1, vector: 1, entityType: 1, entityId: 1, chunkIndex: 1 })
      .limit(5000)
      .lean();
    return candidates
      .map((c) => ({
        id: String(c._id),
        entityType: c.entityType as VectorHit["entityType"],
        entityId: String(c.entityId),
        chunkIndex: c.chunkIndex,
        text: c.text,
        score: cosineSimilarity(vector, c.vector),
      }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(topK, 1), 50));
  }
}

let store: VectorStore | null = null;

/** Singleton accessor; tests inject fakes through setVectorStore(). */
export function getVectorStore(): VectorStore {
  if (!store) store = new MongoVectorStore();
  return store;
}

export function setVectorStore(next: VectorStore | null): void {
  store = next;
}
