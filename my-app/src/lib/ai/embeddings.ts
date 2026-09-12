/**
 * Embedding providers. Ollama for production quality; a deterministic
 * hashed bag-of-words provider for offline dev/test (no credits, no network).
 * Both satisfy the same contract so verification never needs a live key.
 */

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

const HASH_DIMS = 512;

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly name = "hash-bow";
  readonly dimensions = HASH_DIMS;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vec = new Array<number>(HASH_DIMS).fill(0);
      for (const token of tokenize(text)) {
        vec[hashToken(token) % HASH_DIMS] += 1;
      }
      const norm = Math.sqrt(vec.reduce((n, v) => n + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    });
  }
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama";
  readonly dimensions = 1536;
  private readonly model: string;

  constructor(model?: string) {
    this.model = model || process.env.EMBEDDING_MODEL || "nomic-embed-text";
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("http://localhost:11434/api/embed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) {
      throw new Error(`Embedding request failed (${res.status}).`);
    }
    const json = (await res.json()) as { embeddings: number[][] };
    return json.embeddings;
  }
}

/**
 * EMBEDDING_PROVIDER=ollama selects Ollama embeddings;
 * anything else (default) uses the free deterministic hash provider.
 * Service flows (restore, reindex) must never fail for credit reasons
 * unless the operator explicitly opted into billed embeddings.
 * Callers may pass a provider explicitly (tests do) to stay deterministic.
 */
export function getEmbeddingProvider(explicit?: EmbeddingProvider): EmbeddingProvider {
  if (explicit) return explicit;
  if (
    process.env.EMBEDDING_PROVIDER === "ollama" &&
    process.env.OLLAMA_API_KEY
  ) {
    return new OllamaEmbeddingProvider();
  }
  return new HashEmbeddingProvider();
}

/**
 * Admin-aware resolution: explicit provider wins (tests/deterministic),
 * otherwise the layered config (env + `ai.embeddings.*` console settings).
 */
export async function getEffectiveEmbeddingProvider(
  explicit?: EmbeddingProvider,
): Promise<EmbeddingProvider> {
  if (explicit) return explicit;
  try {
    const { getEffectiveAIConfig } = await import("@/src/lib/ai/config");
    const config = await getEffectiveAIConfig();
    if (config.embeddingProvider === "ollama") {
      return new OllamaEmbeddingProvider(config.embeddingModel);
    }
  } catch {
    // Fall through to env-only resolution.
  }
  return getEmbeddingProvider();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
