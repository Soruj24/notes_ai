/**
 * Document → overlapping chunks. Paragraph-first splitting preserves
 * meaning; a sliding window with overlap covers long paragraphs.
 */

export interface TextChunk {
  text: string;
  chunkIndex: number;
}

const TARGET_CHARS = 800;
const OVERLAP_CHARS = 120;
const MAX_CHUNKS = 50;

export function chunkText(input: string): TextChunk[] {
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  function flush() {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > TARGET_CHARS) {
      flush();
      // Sliding window over the long paragraph.
      let start = 0;
      while (start < paragraph.length && chunks.length < MAX_CHUNKS) {
        const end = Math.min(start + TARGET_CHARS, paragraph.length);
        chunks.push(paragraph.slice(start, end).trim());
        if (end >= paragraph.length) break;
        start = end - OVERLAP_CHARS;
      }
      continue;
    }
    if ((current + "\n\n" + paragraph).length > TARGET_CHARS && current) {
      flush();
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
    if (chunks.length >= MAX_CHUNKS) break;
  }
  flush();
  return chunks.slice(0, MAX_CHUNKS).map((text, chunkIndex) => ({ text, chunkIndex }));
}

export interface ChunkableEntity {
  title: string;
  body?: string;
}

/** Title-prefixed document text so chunks carry their own context. */
export function entityDocument(entity: ChunkableEntity): string {
  return [entity.title, entity.body].filter(Boolean).join("\n\n");
}
