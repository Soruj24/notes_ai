import { chunkText, entityDocument } from "@/src/lib/ai/chunk";
import {
  getEffectiveEmbeddingProvider,
  type EmbeddingProvider,
} from "@/src/lib/ai/embeddings";
import { requireMembership } from "@/src/repositories/base";
import { getGoalDetail } from "@/src/services/goal.service";
import { getProjectDetail } from "@/src/services/project.service";
import { getUserNote } from "@/src/services/note.service";
import { getUserTask } from "@/src/services/task.service";
import { listGoalsWithProgress } from "@/src/services/goal.service";
import { listProjectsWithProgress } from "@/src/services/project.service";
import { listUserNotes } from "@/src/services/note.service";
import { listUserTasks } from "@/src/services/task.service";
import { getVectorStore } from "@/src/lib/vectors/mongo-store";
import type {
  VectorEntityType,
  VectorHit,
} from "@/src/lib/vectors/types";
import { requireFlag } from "@/src/lib/features/evaluation";

export interface SemanticHit {
  entityType: VectorEntityType;
  entityId: string;
  title: string;
  excerpt: string;
  score: number;
  href: string;
}

const HREFS: Record<VectorEntityType, string> = {
  notes: "/notes",
  tasks: "/tasks",
  projects: "/projects",
  goals: "/goals",
};

const TYPES: VectorEntityType[] = ["notes", "tasks", "projects", "goals"];

/**
 * Index pipeline: entity → chunks → embeddings → vector store.
 * Query pipeline: text → embedding → filtered similarity → hydrated hits.
 * Membership is verified before every operation; vectors never cross
 * workspace boundaries (store filters first).
 */

export async function indexEntity(
  userId: string,
  workspaceId: string,
  entityType: VectorEntityType,
  entityId: string,
  provider?: EmbeddingProvider,
): Promise<{ chunks: number }> {
  await requireFlag("semantic.search", userId);
  const embedder = await getEffectiveEmbeddingProvider(provider);
  let title = "";
  let body = "";
  if (entityType === "notes") {
    const note = await getUserNote(userId, workspaceId, entityId);
    title = note.title;
    body = note.body ?? "";
  } else if (entityType === "tasks") {
    const task = await getUserTask(userId, workspaceId, entityId);
    title = task.title;
    body = task.notes ?? "";
  } else if (entityType === "projects") {
    const detail = await getProjectDetail(userId, workspaceId, entityId);
    title = detail.project.name;
    body = detail.project.description ?? "";
  } else {
    const detail = await getGoalDetail(userId, workspaceId, entityId);
    title = detail.goal.title;
    body = detail.goal.description ?? "";
  }
  const chunks = chunkText(entityDocument({ title, body }));
  const store = getVectorStore();
  if (!chunks.length) {
    await store.deleteByEntity(workspaceId, entityType, entityId);
    return { chunks: 0 };
  }
  const vectors = await embedder.embed(chunks.map((c) => c.text));
  // Replace-then-write keeps stale chunks from surviving edits.
  await store.deleteByEntity(workspaceId, entityType, entityId);
  await store.upsertMany(
    chunks.map((chunk, i) => ({
      userId,
      workspaceId,
      entityType,
      entityId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      vector: vectors[i],
    })),
  );
  return { chunks: chunks.length };
}

/** Full workspace reindex (bounded per entity for safety). */
export async function indexWorkspace(
  userId: string,
  workspaceId: string,
  provider?: EmbeddingProvider,
): Promise<{ entities: number; chunks: number }> {
  await requireFlag("semantic.search", userId);
  await requireMembership(userId, workspaceId);
  const [notes, tasks, projects, goals] = await Promise.all([
    listUserNotes(userId, workspaceId, { limit: 200 }),
    listUserTasks(userId, workspaceId, { limit: 200 }),
    listProjectsWithProgress(userId, workspaceId),
    listGoalsWithProgress(userId, workspaceId),
  ]);
  let entities = 0;
  let chunks = 0;
  const targets: Array<[VectorEntityType, string]> = [
    ...notes.filter((n) => !n.isDeleted).map((n) => ["notes", n.id] as [VectorEntityType, string]),
    ...tasks.map((t) => ["tasks", t.id] as [VectorEntityType, string]),
    ...projects.map((p) => ["projects", p.project.id] as [VectorEntityType, string]),
    ...goals.map((g) => ["goals", g.goal.id] as [VectorEntityType, string]),
  ];
  for (const [type, id] of targets) {
    const result = await indexEntity(userId, workspaceId, type, id, provider);
    entities += 1;
    chunks += result.chunks;
  }
  return { entities, chunks };
}

export async function removeEntityVectors(
  workspaceId: string,
  entityType: VectorEntityType,
  entityId: string,
): Promise<void> {
  await getVectorStore().deleteByEntity(workspaceId, entityType, entityId);
}

export async function semanticSearch(
  userId: string,
  workspaceId: string,
  query: string,
  options: { types?: VectorEntityType[]; topK?: number; provider?: EmbeddingProvider } = {},
): Promise<SemanticHit[]> {
  await requireFlag("semantic.search", userId);
  await requireMembership(userId, workspaceId);
  const embedder = await getEffectiveEmbeddingProvider(options.provider);
  const [queryVector] = await embedder.embed([query]);
  const types = options.types?.length ? options.types : TYPES;
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const configuredTopK = await getSettingValue("search.semanticTopK", 10);
  const hits: VectorHit[] = await getVectorStore().query(
    queryVector,
    Math.min(Math.max(options.topK ?? configuredTopK, 1), 50),
    { userId, workspaceId, entityTypes: types },
  );
  // Best chunk per entity wins; keep original similarity order.
  const seen = new Set<string>();
  const deduped = hits.filter((h) => {
    const key = `${h.entityType}:${h.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.map((h) => ({
    entityType: h.entityType,
    entityId: h.entityId,
    title: h.text.split("\n")[0].slice(0, 120),
    excerpt: h.text.slice(0, 200),
    score: Math.round(h.score * 1000) / 1000,
    href: `${HREFS[h.entityType]}/${h.entityId}`,
  }));
}

/** Condensed context block for RAG answers. */
export function buildContext(hits: SemanticHit[], maxChars = 4000): string {
  let used = 0;
  const parts: string[] = [];
  for (const hit of hits) {
    const block = `[${hit.entityType} ${hit.entityId}] ${hit.title}\n${hit.excerpt}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}
