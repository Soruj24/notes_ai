/**
 * Vector-store abstraction. Implementations (Mongo brute-force today,
 * Atlas $vectorSearch / Qdrant / pgvector tomorrow) honor this contract:
 * isolation filters apply BEFORE similarity, never after.
 */

export type VectorEntityType = "notes" | "tasks" | "projects" | "goals";

export interface StoredVector {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: VectorEntityType;
  entityId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
  updatedAt: Date;
}

export interface VectorUpsert {
  userId: string;
  workspaceId: string;
  entityType: VectorEntityType;
  entityId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
}

export interface VectorQueryFilter {
  userId: string;
  workspaceId: string;
  entityTypes?: VectorEntityType[];
}

export interface VectorHit {
  id: string;
  entityType: VectorEntityType;
  entityId: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface VectorStore {
  readonly name: string;
  upsertMany(items: VectorUpsert[]): Promise<void>;
  deleteByEntity(workspaceId: string, entityType: VectorEntityType, entityId: string): Promise<number>;
  deleteByWorkspace(workspaceId: string): Promise<number>;
  countByWorkspace(workspaceId: string): Promise<number>;
  query(vector: number[], topK: number, filter: VectorQueryFilter): Promise<VectorHit[]>;
}
